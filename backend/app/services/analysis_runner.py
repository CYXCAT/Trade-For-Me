from __future__ import annotations

from pathlib import Path
import sys
from typing import Any, Generator

# Ensure root package (cli/tradingagents) is importable when backend is run standalone.
REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.append(str(REPO_ROOT))

from cli.main import ANALYST_ORDER  # noqa: E402
from tradingagents.default_config import DEFAULT_CONFIG  # noqa: E402
from tradingagents.graph.trading_graph import TradingAgentsGraph  # noqa: E402

from app.services.orchestrator import build_final_prompt, build_graph_config_from_state


def ordered_analysts(selected: list[str]) -> list[str]:
    selected_set = {x.lower() for x in selected}
    return [a for a in ANALYST_ORDER if a in selected_set]


def run_graph_stream(state: dict[str, Any]) -> Generator[dict[str, Any], None, dict[str, Any]]:
    config = DEFAULT_CONFIG.copy()
    config.update(build_graph_config_from_state(state))
    analysts = ordered_analysts(state["analysts"])
    graph = TradingAgentsGraph(
        selected_analysts=analysts,
        config=config,
        debug=True,
        callbacks=[],
    )

    init_state = graph.propagator.create_initial_state(
        build_final_prompt(state),
        state["analysis_date"],
    )
    args = graph.propagator.get_graph_args(callbacks=[])

    last_chunk: dict[str, Any] = {}
    for chunk in graph.graph.stream(init_state, **args):
        last_chunk = chunk
        msg = ""
        if chunk.get("messages"):
            latest = chunk["messages"][-1]
            msg = getattr(latest, "content", "") or ""
        yield {
            "type": "chunk",
            "content": msg,
            "raw": chunk,
        }

    return last_chunk
