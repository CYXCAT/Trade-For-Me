from __future__ import annotations

import datetime as dt
from typing import Any

from app.services.cli_mapping import (
    DEEP_MODELS,
    PROVIDER_SPECIFIC_STEP,
    PROVIDER_URL_MAP,
    SHALLOW_MODELS,
    build_workflow_steps,
)

REQUIRED_BASE_KEYS = [
    "ticker",
    "analysis_date",
    "analysts",
    "research_depth",
    "llm_provider",
    "shallow_thinker",
    "deep_thinker",
]


def normalize_step_value(step_key: str, value: Any) -> Any:
    if step_key == "ticker":
        if isinstance(value, str):
            return value.strip().upper() or "SPY"
        return "SPY"
    if step_key == "analysis_date":
        value_str = str(value or "").strip()
        if not value_str:
            value_str = dt.datetime.utcnow().strftime("%Y-%m-%d")
        date = dt.datetime.strptime(value_str, "%Y-%m-%d")
        if date.date() > dt.datetime.utcnow().date():
            raise ValueError("Analysis date cannot be in the future")
        return value_str
    if step_key == "research_depth":
        return int(value)
    if step_key == "analysts":
        if not isinstance(value, list) or not value:
            raise ValueError("At least one analyst is required")
        return [str(x) for x in value]
    if step_key in ("supplemental_prompt",):
        if value is None:
            return None
        return str(value).strip() or None
    return value


def validate_state(state: dict[str, Any]) -> list[str]:
    missing = [k for k in REQUIRED_BASE_KEYS if k not in state or state[k] in (None, "", [])]
    provider = state.get("llm_provider")
    if provider in PROVIDER_SPECIFIC_STEP:
        required = PROVIDER_SPECIFIC_STEP[provider].key
        if state.get(required) in (None, ""):
            missing.append(required)
    if provider and state.get("shallow_thinker") not in SHALLOW_MODELS.get(provider, []) and provider != "siliconflow":
        pass
    if provider and state.get("deep_thinker") not in DEEP_MODELS.get(provider, []) and provider != "siliconflow":
        pass
    return missing


def next_step_key(state: dict[str, Any]) -> str | None:
    provider = state.get("llm_provider")
    ordered = [x.key for x in build_workflow_steps(provider=provider)]
    for key in ordered:
        if key == "supplemental_prompt":
            continue
        if state.get(key) in (None, "", []):
            return key
    return None


def build_graph_config_from_state(state: dict[str, Any]) -> dict[str, Any]:
    provider = state["llm_provider"]
    return {
        "max_debate_rounds": state["research_depth"],
        "max_risk_discuss_rounds": state["research_depth"],
        "quick_think_llm": state["shallow_thinker"],
        "deep_think_llm": state["deep_thinker"],
        "backend_url": PROVIDER_URL_MAP[provider],
        "llm_provider": provider,
        "google_thinking_level": state.get("google_thinking_level"),
        "openai_reasoning_effort": state.get("openai_reasoning_effort"),
        "anthropic_effort": state.get("anthropic_effort"),
    }


def build_final_prompt(state: dict[str, Any]) -> str:
    base = state["ticker"]
    supplement = state.get("supplemental_prompt")
    if not supplement:
        return base
    return f"{base}\n\nAdditional user context:\n{supplement}"
