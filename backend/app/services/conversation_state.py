from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.message import Message

STATE_ROLE = "tool"
STATE_MARKER = "__workflow_state__"


def new_conversation_id() -> str:
    now = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
    return f"conv_{now}"


def conversation_title_from_state(state: dict[str, Any]) -> str:
    """侧边栏与会话标题：ticker + 空格 + analysis_date；缺一则尽量展示已有字段。"""
    ticker = str(state.get("ticker") or "").strip()
    analysis_date = str(state.get("analysis_date") or "").strip()
    if ticker and analysis_date:
        return f"{ticker} {analysis_date}"
    if ticker:
        return ticker
    if analysis_date:
        return analysis_date
    return "New Conversation"


def get_state(db: Session, conversation_id: str) -> dict[str, Any]:
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id, Message.role == STATE_ROLE)
        .order_by(desc(Message.created_at))
        .limit(1)
    )
    row = db.execute(stmt).scalar_one_or_none()
    if not row:
        return {}
    payload = row.content
    if isinstance(payload, str):
        payload = json.loads(payload)
    if payload.get("marker") != STATE_MARKER:
        return {}
    return payload.get("state", {})


def save_state(db: Session, conversation_id: str, state: dict[str, Any]) -> None:
    db.add(
        Message(
            conversation_id=conversation_id,
            role=STATE_ROLE,
            content={"marker": STATE_MARKER, "state": state},
            token_count=None,
            model=None,
        )
    )
    db.commit()


def append_message(
    db: Session,
    conversation_id: str,
    role: str,
    content: Any,
    token_count: int | None = None,
    model: str | None = None,
) -> None:
    db.add(
        Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            token_count=token_count,
            model=model,
        )
    )
    db.commit()
