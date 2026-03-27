# TradingAgents/graph/signal_processing.py

from langchain_openai import ChatOpenAI


class SignalProcessor:
    """Processes trading signals to extract actionable decisions."""

    def __init__(self, quick_thinking_llm: ChatOpenAI):
        """Initialize with an LLM for processing."""
        self.quick_thinking_llm = quick_thinking_llm

    def process_signal(self, full_signal: str) -> str:
        """
        Process a full trading signal to extract the core decision.

        Args:
            full_signal: Complete trading signal text

        Returns:
            Extracted rating (BUY, OVERWEIGHT, HOLD, UNDERWEIGHT, or SELL)
        """
        messages = [
            (
                "system",
                "You are an efficient assistant designed to analyze paragraphs or financial reports from analysts. "
                "The text may be in Chinese or English. Extract the rating as exactly one of: "
                "BUY, OVERWEIGHT, HOLD, UNDERWEIGHT, SELL. "
                "Reply with exactly one English word — the rating only; no Chinese characters, no punctuation, no explanation.",
            ),
            ("human", full_signal),
        ]

        return self.quick_thinking_llm.invoke(messages).content
