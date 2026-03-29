from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class StepOption(BaseModel):
    label: str
    value: str | int


class WorkflowStep(BaseModel):
    key: str
    order: int
    title: str
    prompt: str
    kind: str
    required: bool = True
    options: list[StepOption] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)


class ConversationCreateResponse(BaseModel):
    conversation_id: str
    assistant_message: str
    created_at: datetime


class StepSubmitRequest(BaseModel):
    step_key: str
    value: Any


class StepSubmitResponse(BaseModel):
    conversation_id: str
    next_step_key: str | None
    completed: bool
    workflow_steps: list[WorkflowStep]
    state: dict[str, Any]


class RunAnalysisRequest(BaseModel):
    supplemental_prompt: str | None = None


class ConversationSummary(BaseModel):
    conversation_id: str
    title: str
    updated_at: datetime


class MessageOut(BaseModel):
    role: str
    content: Any
    token_count: int | None = None
    model: str | None = None
    created_at: datetime
