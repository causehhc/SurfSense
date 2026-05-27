"""Tests for SafeSummarizationMiddleware."""

from __future__ import annotations

import inspect
from unittest.mock import AsyncMock, MagicMock

import pytest
from langchain.tools import ToolRuntime
from langchain_core.messages import AIMessage
from langchain_core.messages.utils import get_buffer_string

from app.agents.new_chat.middleware.safe_summarization import (
    SafeSummarizationMiddleware,
    _sanitize_message_content,
)

pytestmark = pytest.mark.unit


@pytest.mark.skipif(
    "tools" not in inspect.signature(ToolRuntime.__init__).parameters,
    reason="ToolRuntime.tools only exists on newer langchain builds",
)
def test_get_backend_passes_tools_to_tool_runtime() -> None:
    """_get_backend must pass tools= when deepagents omits it (langchain>=1.2)."""
    captured: dict[str, ToolRuntime] = {}

    def backend_factory(tool_runtime: ToolRuntime) -> MagicMock:
        captured["tool_runtime"] = tool_runtime
        return MagicMock(name="backend")

    mw = SafeSummarizationMiddleware.__new__(SafeSummarizationMiddleware)
    mw._backend = backend_factory

    runtime = MagicMock()
    runtime.context = {}
    runtime.stream_writer = MagicMock()
    runtime.store = None
    runtime.config = {}
    runtime.tools = []

    state: dict = {"messages": []}
    backend = mw._get_backend(state, runtime)  # type: ignore[arg-type]

    assert backend is captured["tool_runtime"] or hasattr(backend, "mock")
    tool_runtime = captured["tool_runtime"]
    assert isinstance(tool_runtime, ToolRuntime)
    assert tool_runtime.tools == []


def _aimessage_with_none_content() -> AIMessage:
    """Tool-only AIMessage as seen after checkpoint/deserialization (content=None)."""
    msg = AIMessage.model_construct(
        content=None,
        tool_calls=[{"name": "search", "args": {}, "id": "1"}],
    )
    return msg


def test_sanitize_message_content_fixes_none_content() -> None:
    """content=None AIMessages must not break get_buffer_string."""
    msg = _aimessage_with_none_content()
    sanitized = _sanitize_message_content(msg)
    assert sanitized.content == ""
    assert sanitized is not msg
    get_buffer_string([sanitized])


@pytest.mark.asyncio
async def test_acreate_summary_sanitizes_none_content() -> None:
    """_acreate_summary must sanitize before delegating to the LC helper."""
    mw = SafeSummarizationMiddleware.__new__(SafeSummarizationMiddleware)
    mw._lc_helper = MagicMock()
    mw._lc_helper._acreate_summary = AsyncMock(return_value="ok")

    msg = _aimessage_with_none_content()
    result = await mw._acreate_summary([msg])

    assert result == "ok"
    passed = mw._lc_helper._acreate_summary.call_args[0][0]
    assert passed[0].content == ""
    assert passed[0] is not msg
