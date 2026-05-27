"""Safe wrapper around deepagents' SummarizationMiddleware.

Upstream issues
---------------
1. LangChain's ``SummarizationMiddleware._acreate_summary`` and deepagents'
   ``_aoffload_to_backend`` call ``get_buffer_string(...)``. Recent
   ``langchain-core`` versions iterate ``m.content`` via ``m.text`` — this
   raises ``TypeError: 'NoneType' object is not iterable`` when an
   ``AIMessage`` has ``content=None`` (tool_calls-only responses).

2. ``SummarizationMiddleware._get_backend`` constructs ``ToolRuntime`` without
   the ``tools`` argument. Current ``langchain`` / ``langgraph-prebuilt`` require
   ``tools``, causing ``TypeError: ToolRuntime.__init__() missing 1 required
   positional argument: 'tools'`` when context compaction triggers on long chats.

Fixes
-----
We subclass ``SummarizationMiddleware`` and override:

- ``_create_summary`` / ``_acreate_summary`` — sanitize messages before the
  LangChain helper calls ``get_buffer_string`` (the path that crashed in
  production).
- ``_filter_summary_messages`` — same sanitization for backend offload.
- ``_get_backend`` — pass ``tools`` when building ``ToolRuntime`` for backend
  factories (prefer ``runtime.tools`` when present).

We also expose a drop-in ``create_safe_summarization_middleware`` factory
that mirrors ``deepagents.middleware.summarization.create_summarization_middleware``
but instantiates our safe subclass.
"""

from __future__ import annotations

import inspect
import logging
from typing import TYPE_CHECKING, Any, cast

from deepagents.middleware.summarization import (
    SummarizationMiddleware,
    compute_summarization_defaults,
)
from langchain.agents.middleware.types import AgentState
from langchain.tools import ToolRuntime
from langgraph.runtime import Runtime

if TYPE_CHECKING:
    from deepagents.backends.protocol import BACKEND_TYPES, BackendProtocol
    from langchain_core.language_models import BaseChatModel
    from langchain_core.messages import AnyMessage
    from langchain_core.runnables import RunnableConfig

logger = logging.getLogger(__name__)


def _sanitize_message_content(msg: AnyMessage) -> AnyMessage:
    """Return ``msg`` with ``content`` coerced to a non-``None`` value.

    ``get_buffer_string`` reads ``m.text`` which iterates ``self.content``;
    when a provider streams back an ``AIMessage`` with only tool_calls and
    no text, ``content`` can be ``None`` and the iteration explodes. We
    replace ``None`` with an empty string so downstream consumers that only
    care about text see an empty body.

    The original message is left untouched — we return a copy via
    pydantic's ``model_copy`` when available, otherwise we fall back to
    re-setting the attribute on a shallow copy.
    """

    if getattr(msg, "content", "not-missing") is not None:
        return msg

    try:
        return msg.model_copy(update={"content": ""})
    except AttributeError:
        import copy

        new_msg = copy.copy(msg)
        try:
            new_msg.content = ""
        except Exception:  # pragma: no cover - defensive
            logger.debug(
                "Could not sanitize content=None on message of type %s",
                type(msg).__name__,
            )
            return msg
        return new_msg


def _sanitize_messages_for_buffer(messages: list[AnyMessage]) -> list[AnyMessage]:
    """Coerce ``content=None`` on every message before ``get_buffer_string``."""

    return [_sanitize_message_content(m) for m in messages]


class SafeSummarizationMiddleware(SummarizationMiddleware):
    """`SummarizationMiddleware` hardened for current LangChain ToolRuntime APIs."""

    def _create_summary(self, messages_to_summarize: list[AnyMessage]) -> str:
        return super()._create_summary(
            _sanitize_messages_for_buffer(messages_to_summarize)
        )

    async def _acreate_summary(self, messages_to_summarize: list[AnyMessage]) -> str:
        return await super()._acreate_summary(
            _sanitize_messages_for_buffer(messages_to_summarize)
        )

    def _filter_summary_messages(self, messages: list[AnyMessage]) -> list[AnyMessage]:
        filtered = super()._filter_summary_messages(messages)
        return _sanitize_messages_for_buffer(filtered)

    def _get_backend(
        self,
        state: AgentState[Any],
        runtime: Runtime,
    ) -> BackendProtocol:
        """Resolve backend; supply ``tools`` when constructing ``ToolRuntime``.

        Upstream ``deepagents`` omits ``tools``, which breaks on langchain>=1.2
        when summarization runs on long conversations.
        """
        if callable(self._backend):
            config = cast("RunnableConfig", getattr(runtime, "config", {}))
            tool_runtime_kwargs: dict[str, Any] = {
                "state": state,
                "context": runtime.context,
                "stream_writer": runtime.stream_writer,
                "store": runtime.store,
                "config": config,
                "tool_call_id": None,
            }
            if "tools" in inspect.signature(ToolRuntime.__init__).parameters:
                tool_runtime_kwargs["tools"] = list(
                    getattr(runtime, "tools", None) or []
                )
            tool_runtime = ToolRuntime(**tool_runtime_kwargs)
            return self._backend(tool_runtime)  # ty: ignore[call-top-callable]
        return self._backend


def create_safe_summarization_middleware(
    model: BaseChatModel,
    backend: BACKEND_TYPES,
) -> SafeSummarizationMiddleware:
    """Drop-in replacement for ``create_summarization_middleware``.

    Mirrors the defaults computed by ``deepagents`` but returns our
    ``SafeSummarizationMiddleware`` subclass so the
    ``content=None`` crash in ``get_buffer_string`` is avoided.
    """

    defaults = compute_summarization_defaults(model)
    return SafeSummarizationMiddleware(
        model=model,
        backend=backend,
        trigger=defaults["trigger"],
        keep=defaults["keep"],
        trim_tokens_to_summarize=None,
        truncate_args_settings=defaults["truncate_args_settings"],
    )


__all__ = [
    "SafeSummarizationMiddleware",
    "create_safe_summarization_middleware",
]
