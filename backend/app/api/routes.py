from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sse_starlette.sse import EventSourceResponse
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, get_db
from app.models.message import Message
from app.models.prompt import Prompt
from app.models.user import User
from app.schemas.workflow import (
    ConversationCreateResponse,
    ConversationSummary,
    MessageOut,
    RunAnalysisRequest,
    StepSubmitRequest,
    StepSubmitResponse,
)
from app.services.analysis_runner import run_graph_stream
from app.services.auth import require_active_user
from app.services.cli_mapping import WELCOME_MESSAGE, build_workflow_steps
from app.services.conversation_state import (
    append_message,
    get_state,
    new_conversation_id,
    save_state,
)
from app.services.orchestrator import (
    build_final_prompt,
    next_step_key,
    normalize_step_value,
    validate_state,
)

router = APIRouter(prefix="/api")


@router.post("/conversations", response_model=ConversationCreateResponse)
def create_conversation(
    db: Session = Depends(get_db),
    user: User = Depends(require_active_user),
):
    conversation_id = new_conversation_id()
    now = datetime.now(timezone.utc)
    append_message(db, conversation_id, "assistant", WELCOME_MESSAGE)
    save_state(db, conversation_id, {"created_by": str(user.id)})
    return ConversationCreateResponse(
        conversation_id=conversation_id,
        assistant_message=WELCOME_MESSAGE,
        created_at=now,
    )


@router.get("/conversations", response_model=list[ConversationSummary])
def list_conversations(
    db: Session = Depends(get_db),
    _: User = Depends(require_active_user),
):
    stmt = (
        select(
            Message.conversation_id,
            func.max(Message.created_at).label("updated_at"),
        )
        .group_by(Message.conversation_id)
        .order_by(desc("updated_at"))
    )
    rows = db.execute(stmt).all()
    data: list[ConversationSummary] = []
    for row in rows:
        cid = row.conversation_id
        first_stmt = (
            select(Message)
            .where(Message.conversation_id == cid, Message.role != "tool")
            .order_by(Message.created_at.asc())
            .limit(1)
        )
        first_msg = db.execute(first_stmt).scalar_one_or_none()
        title = "New Conversation"
        if first_msg:
            content = first_msg.content if isinstance(first_msg.content, str) else json.dumps(first_msg.content)
            title = content[:40]
        data.append(ConversationSummary(conversation_id=cid, title=title, updated_at=row.updated_at))
    return data


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def get_conversation_messages(
    conversation_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_active_user),
):
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id, Message.role != "tool")
        .order_by(Message.created_at.asc())
    )
    rows = db.execute(stmt).scalars().all()
    return [
        MessageOut(
            role=r.role,
            content=r.content,
            token_count=r.token_count,
            model=r.model,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.get("/conversations/{conversation_id}/workflow", response_model=StepSubmitResponse)
def get_workflow(
    conversation_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_active_user),
):
    state = get_state(db, conversation_id)
    provider = state.get("llm_provider")
    steps = build_workflow_steps(provider=provider)
    nkey = next_step_key(state)
    return StepSubmitResponse(
        conversation_id=conversation_id,
        next_step_key=nkey,
        completed=nkey is None,
        workflow_steps=steps,
        state=state,
    )


@router.post("/conversations/{conversation_id}/workflow", response_model=StepSubmitResponse)
def submit_step(
    conversation_id: str,
    payload: StepSubmitRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_active_user),
):
    state = get_state(db, conversation_id)
    try:
        normalized = normalize_step_value(payload.step_key, payload.value)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    state[payload.step_key] = normalized
    save_state(db, conversation_id, state)

    if payload.step_key not in ("supplemental_prompt",):
        append_message(db, conversation_id, "user", {"step_key": payload.step_key, "value": normalized})

    provider = state.get("llm_provider")
    steps = build_workflow_steps(provider=provider)
    nkey = next_step_key(state)
    return StepSubmitResponse(
        conversation_id=conversation_id,
        next_step_key=nkey,
        completed=nkey is None,
        workflow_steps=steps,
        state=state,
    )


@router.post("/conversations/{conversation_id}/run")
def run_analysis(
    conversation_id: str,
    payload: RunAnalysisRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_user),
):
    state = get_state(db, conversation_id)
    if payload.supplemental_prompt is not None:
        state["supplemental_prompt"] = payload.supplemental_prompt.strip() or None
        save_state(db, conversation_id, state)

    missing = validate_state(state)
    if missing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Missing required steps: {missing}")

    final_prompt = build_final_prompt(state)
    append_message(db, conversation_id, "user", {"final_prompt": final_prompt})

    db.add(
        Prompt(
            name=f"{conversation_id}-final-prompt",
            content=final_prompt,
            variables=state,
            version=1,
            created_by=user.id,
        )
    )
    db.commit()

    def event_generator():
        stream_db = SessionLocal()
        try:
            for chunk in run_graph_stream(state):
                content = chunk.get("content", "")
                if content:
                    append_message(stream_db, conversation_id, "assistant", content)
                yield {"event": "chunk", "data": json.dumps(chunk, ensure_ascii=False, default=str)}
            yield {"event": "done", "data": json.dumps({"status": "completed"})}
        except Exception as exc:
            yield {"event": "error", "data": json.dumps({"error": str(exc)})}
        finally:
            stream_db.close()

    return EventSourceResponse(event_generator())
