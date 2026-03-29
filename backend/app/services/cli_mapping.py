from __future__ import annotations

from app.schemas.workflow import StepOption, WorkflowStep


WELCOME_MESSAGE = "您今天想查看关于什么东西的资讯?"

ANALYST_OPTIONS = [
    StepOption(label="Market Analyst", value="market"),
    StepOption(label="Social Media Analyst", value="social"),
    StepOption(label="News Analyst", value="news"),
    StepOption(label="Fundamentals Analyst", value="fundamentals"),
]

RESEARCH_DEPTH_OPTIONS = [
    StepOption(label="Shallow - Quick research, few debate and strategy discussion rounds", value=1),
    StepOption(label="Medium - Middle ground, moderate debate rounds and strategy discussion", value=3),
    StepOption(label="Deep - Comprehensive research, in depth debate and strategy discussion", value=5),
]

PROVIDER_OPTIONS = [
    StepOption(label="OpenAI", value="openai"),
    StepOption(label="Google", value="google"),
    StepOption(label="Anthropic", value="anthropic"),
    StepOption(label="xAI", value="xai"),
    StepOption(label="Openrouter", value="openrouter"),
    StepOption(label="SiliconFlow", value="siliconflow"),
    StepOption(label="Ollama", value="ollama"),
]

PROVIDER_URL_MAP = {
    "openai": "https://api.openai.com/v1",
    "google": "https://generativelanguage.googleapis.com/v1",
    "anthropic": "https://api.anthropic.com/",
    "xai": "https://api.x.ai/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "siliconflow": "https://api.siliconflow.cn/v1",
    "ollama": "http://localhost:11434/v1",
}

SHALLOW_MODELS = {
    "openai": ["gpt-5-mini", "gpt-5-nano", "gpt-5.4", "gpt-4.1"],
    "anthropic": ["claude-sonnet-4-6", "claude-haiku-4-5", "claude-sonnet-4-5"],
    "google": ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-3.1-flash-lite-preview", "gemini-2.5-flash-lite"],
    "xai": ["grok-4-1-fast-non-reasoning", "grok-4-fast-non-reasoning", "grok-4-1-fast-reasoning"],
    "openrouter": ["nvidia/nemotron-3-nano-30b-a3b:free", "z-ai/glm-4.5-air:free"],
    "siliconflow": [
        "deepseek-ai/DeepSeek-V3.2",
        "Qwen/Qwen3.5-4B",
        "Qwen/Qwen3.5-9B",
        "deepseek-ai/DeepSeek-R1",
        "stepfun-ai/Step-3.5-Flash",
        "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B",
        "Qwen/Qwen3-8B",
    ],
    "ollama": ["qwen3:latest", "gpt-oss:latest", "glm-4.7-flash:latest"],
}

DEEP_MODELS = {
    "openai": ["gpt-5.4", "gpt-5.2", "gpt-5-mini", "gpt-5.4-pro"],
    "anthropic": ["claude-opus-4-6", "claude-opus-4-5", "claude-sonnet-4-6", "claude-sonnet-4-5"],
    "google": ["gemini-3.1-pro-preview", "gemini-3-flash-preview", "gemini-2.5-pro", "gemini-2.5-flash"],
    "xai": ["grok-4-0709", "grok-4-1-fast-reasoning", "grok-4-fast-reasoning", "grok-4-1-fast-non-reasoning"],
    "openrouter": ["z-ai/glm-4.5-air:free", "nvidia/nemotron-3-nano-30b-a3b:free"],
    "siliconflow": SHALLOW_MODELS["siliconflow"],
    "ollama": ["glm-4.7-flash:latest", "gpt-oss:latest", "qwen3:latest"],
}

PROVIDER_SPECIFIC_STEP = {
    "google": WorkflowStep(
        key="google_thinking_level",
        order=7,
        title="Step 7: Thinking Mode",
        prompt="Configure Gemini thinking mode",
        kind="single_select",
        options=[
            StepOption(label="Enable Thinking (recommended)", value="high"),
            StepOption(label="Minimal/Disable Thinking", value="minimal"),
        ],
    ),
    "openai": WorkflowStep(
        key="openai_reasoning_effort",
        order=7,
        title="Step 7: Reasoning Effort",
        prompt="Configure OpenAI reasoning effort level",
        kind="single_select",
        options=[
            StepOption(label="Medium (Default)", value="medium"),
            StepOption(label="High (More thorough)", value="high"),
            StepOption(label="Low (Faster)", value="low"),
        ],
    ),
    "anthropic": WorkflowStep(
        key="anthropic_effort",
        order=7,
        title="Step 7: Effort Level",
        prompt="Configure Claude effort level",
        kind="single_select",
        options=[
            StepOption(label="High (recommended)", value="high"),
            StepOption(label="Medium (balanced)", value="medium"),
            StepOption(label="Low (faster, cheaper)", value="low"),
        ],
    ),
}


def build_workflow_steps(provider: str | None = None) -> list[WorkflowStep]:
    steps: list[WorkflowStep] = [
        WorkflowStep(
            key="ticker",
            order=1,
            title="Step 1: Ticker Symbol",
            prompt="Enter ticker, or use default SPY",
            kind="choice_or_input",
            options=[StepOption(label="SPY", value="SPY"), StepOption(label="自定义", value="__custom__")],
        ),
        WorkflowStep(
            key="analysis_date",
            order=2,
            title="Step 2: Analysis Date",
            prompt="Enter the analysis date (YYYY-MM-DD)",
            kind="date_input",
        ),
        WorkflowStep(
            key="analysts",
            order=3,
            title="Step 3: Analysts Team",
            prompt="Select your LLM analyst agents for the analysis",
            kind="multi_select",
            options=ANALYST_OPTIONS,
        ),
        WorkflowStep(
            key="research_depth",
            order=4,
            title="Step 4: Research Depth",
            prompt="Select your research depth level",
            kind="single_select",
            options=RESEARCH_DEPTH_OPTIONS,
        ),
        WorkflowStep(
            key="llm_provider",
            order=5,
            title="Step 5: OpenAI backend",
            prompt="Select which service to talk to",
            kind="single_select",
            options=PROVIDER_OPTIONS,
        ),
        WorkflowStep(
            key="shallow_thinker",
            order=6,
            title="Step 6A: Quick-Thinking LLM",
            prompt="Select your quick-thinking model",
            kind="single_select_or_custom",
            options=[],
        ),
        WorkflowStep(
            key="deep_thinker",
            order=6,
            title="Step 6B: Deep-Thinking LLM",
            prompt="Select your deep-thinking model",
            kind="single_select_or_custom",
            options=[],
        ),
    ]

    if provider:
        steps[5].options = [StepOption(label=x, value=x) for x in SHALLOW_MODELS.get(provider, [])]
        steps[6].options = [StepOption(label=x, value=x) for x in DEEP_MODELS.get(provider, [])]
        if provider in PROVIDER_SPECIFIC_STEP:
            steps.append(PROVIDER_SPECIFIC_STEP[provider])

    steps.append(
        WorkflowStep(
            key="supplemental_prompt",
            order=8,
            title="Step 8: What else do you want to add?",
            prompt="You can skip or add more requirements to be appended to the prompt.",
            kind="optional_text",
            required=False,
        )
    )
    return steps


def _option_label_for_step(step: WorkflowStep | None, value: object) -> str:
    if not step:
        return str(value)
    for o in step.options:
        if o.value == value or str(o.value) == str(value):
            return o.label
    return str(value)


def format_step_value_for_chat(step_key: str, value: object, provider: str | None, steps: list[WorkflowStep]) -> str:
    """将某一步的规范化取值转为对话中展示的纯文本。"""
    by_key = {s.key: s for s in steps}
    step = by_key.get(step_key)

    if step_key == "analysts":
        if not isinstance(value, list):
            return str(value)
        m = {str(o.value): o.label for o in ANALYST_OPTIONS}
        return "、".join(m.get(str(v), str(v)) for v in value)

    if step_key == "supplemental_prompt":
        s = str(value or "").strip()
        return s if s else "（无额外说明）"

    if step_key in (
        "research_depth",
        "llm_provider",
        "google_thinking_level",
        "openai_reasoning_effort",
        "anthropic_effort",
    ):
        return _option_label_for_step(step, value)

    return str(value)


def workflow_step_chat_pair(
    step_key: str, normalized: object, provider: str | None
) -> tuple[str, str] | None:
    """
    用户完成某步后写入对话：左侧为步骤标题与说明（assistant），右侧为纯文本选择（user）。
    跳过补充说明时不写入。
    """
    if step_key == "supplemental_prompt" and normalized in (None, "", []):
        return None

    steps = build_workflow_steps(provider=provider)
    by_key = {s.key: s for s in steps}
    step = by_key.get(step_key)
    if not step:
        return None

    assistant_text = f"{step.title}\n\n{step.prompt}"
    user_text = format_step_value_for_chat(step_key, normalized, provider, steps)
    return assistant_text, user_text
