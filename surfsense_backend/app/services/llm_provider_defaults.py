"""Provider-specific defaults for LiteLLM / ChatLiteLLM construction."""

from __future__ import annotations

from typing import Any

# VIO internal gateway — OpenAI-compatible (see vio_doc/)
VIO_DEFAULT_API_BASE = "https://vio.automotive-wan.com:446"
VIO_DEFAULT_EXTRA_HEADERS = {
    "useLegacyCompletionsEndpoint": "false",
    "X-Tenant-ID": "default_tenant",
}


def merge_litellm_provider_defaults(provider: str, kwargs: dict[str, Any]) -> dict[str, Any]:
    """Apply built-in api_base / extra_headers when the provider is VIO."""
    if (provider or "").upper() != "VIO":
        return kwargs

    if not kwargs.get("api_base"):
        kwargs["api_base"] = VIO_DEFAULT_API_BASE

    extra = dict(kwargs.get("extra_headers") or {})
    for key, value in VIO_DEFAULT_EXTRA_HEADERS.items():
        extra.setdefault(key, value)
    kwargs["extra_headers"] = extra
    return kwargs
