"""
app/services/llm.py – Chat-model and embedding factories.

Switch providers with LLM_PROVIDER / EMBEDDING_PROVIDER ("google" or "openai").

Resilience on free tiers:
  * LLM_REQUESTS_PER_MINUTE – client-side throttle per model.
  * Automatic model fallback – when a model answers "quota exhausted / rate limited /
    overloaded", the call is retried on the next model in LLM_FALLBACK_MODELS, and the
    exhausted model is skipped until its quota resets (the provider's retry delay).
"""

import logging
import re
import time
from functools import lru_cache

from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel
from langchain_core.rate_limiters import InMemoryRateLimiter

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMNotConfigured(RuntimeError):
    pass


def _require(key: str, name: str) -> str:
    if not key:
        raise LLMNotConfigured(f"{name} is not set")
    return key


def _rate_limiter() -> InMemoryRateLimiter | None:
    rpm = settings.llm_requests_per_minute
    if rpm <= 0:
        return None
    return InMemoryRateLimiter(requests_per_second=rpm / 60, check_every_n_seconds=0.2, max_bucket_size=1)


# ── Model fallback ────────────────────────────────────────────────────────────

_CAPACITY_MARKERS = ("resource_exhausted", "ratelimit", "rate limit", "rate_limit", "429", "quota",
                     "503", "unavailable", "overloaded")
_MISSING_MARKERS = ("404", "not_found", "not found", "is not supported")
_cooldown_until: dict[str, float] = {}   # model name → time.monotonic() when it may be retried
_siblings: dict[tuple[type, str], BaseChatModel] = {}


def is_capacity_error(exc: BaseException) -> bool:
    text = f"{type(exc).__name__} {exc}".lower()
    return any(m in text for m in _CAPACITY_MARKERS)


def _is_missing_model(exc: BaseException) -> bool:
    text = f"{type(exc).__name__} {exc}".lower()
    return any(m in text for m in _MISSING_MARKERS)


def retry_after_seconds(exc: BaseException, default: float = 60.0) -> float:
    """Parse the provider's suggested wait, e.g. 'Please retry in 11h4m34.1s' or "retryDelay': '42s'"."""
    text = str(exc)
    m = re.search(r"retry in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?", text)
    if m and any(m.groups()):
        h, mi, s = (float(g) if g else 0.0 for g in m.groups())
        return h * 3600 + mi * 60 + s
    m = re.search(r"retryDelay['\"]?:\s*['\"](\d+)s", text)
    return float(m.group(1)) if m else default


def _plain(name: str) -> str:
    return name.removeprefix("models/")


class _FallbackMixin:
    """Retries a failed call on the next configured model when the current one is out of capacity."""

    def _candidates(self) -> list[str]:
        names = list(dict.fromkeys([_plain(self.model), *settings.fallback_model_names]))
        now = time.monotonic()
        ready = [n for n in names if _cooldown_until.get(n, 0) <= now]
        return ready or names[:1]

    def _for(self, name: str) -> BaseChatModel:
        if name == _plain(self.model):
            return self
        key = (type(self), name)
        if key not in _siblings:
            _siblings[key] = self.model_copy(update={"model": name, "rate_limiter": _rate_limiter()})
        return _siblings[key]

    def _skip(self, name: str, exc: BaseException) -> bool:
        """Put a model on cooldown if the error means 'try another model'. Returns True if so."""
        if is_capacity_error(exc):
            wait = retry_after_seconds(exc)
        elif _is_missing_model(exc) and name != _plain(self.model):
            wait = 24 * 3600  # a fallback name this API key cannot use
        else:
            return False
        _cooldown_until[name] = time.monotonic() + wait
        logger.warning("Model %s unavailable (%s) – skipping it for %.0fs", name, type(exc).__name__, wait)
        return True

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        error = None
        for name in self._candidates():
            try:
                return super(_FallbackMixin, self._for(name))._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
            except Exception as exc:
                if not self._skip(name, exc):
                    raise
                error = exc
        raise error

    async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        error = None
        for name in self._candidates():
            try:
                return await super(_FallbackMixin, self._for(name))._agenerate(
                    messages, stop=stop, run_manager=run_manager, **kwargs)
            except Exception as exc:
                if not self._skip(name, exc):
                    raise
                error = exc
        raise error

    def _stream(self, messages, stop=None, run_manager=None, **kwargs):
        error = None
        for name in self._candidates():
            started = False
            try:
                for chunk in super(_FallbackMixin, self._for(name))._stream(messages, stop=stop, run_manager=run_manager, **kwargs):
                    started = True
                    yield chunk
                return
            except Exception as exc:
                if started or not self._skip(name, exc):
                    raise
                error = exc
        raise error

    async def _astream(self, messages, stop=None, run_manager=None, **kwargs):
        error = None
        for name in self._candidates():
            started = False
            try:
                async for chunk in super(_FallbackMixin, self._for(name))._astream(
                        messages, stop=stop, run_manager=run_manager, **kwargs):
                    started = True
                    yield chunk
                return
            except Exception as exc:
                if started or not self._skip(name, exc):
                    raise
                error = exc
        raise error


def _with_fallback(cls: type[BaseChatModel]) -> type[BaseChatModel]:
    return type(f"Fallback{cls.__name__}", (_FallbackMixin, cls), {})


# ── Factories ─────────────────────────────────────────────────────────────────

@lru_cache
def get_chat_model(model_name: str | None = None, forced_routing: bool = False) -> BaseChatModel:
    """
    Return a (cached) chat model; `model_name` defaults to LLM_MODEL.
    `forced_routing=True` builds the supervisor variant that obeys agents picked in the UI.
    """
    from app.agents.routing import forced_routing_class

    def build(cls: type[BaseChatModel]) -> type[BaseChatModel]:
        cls = _with_fallback(cls)
        return forced_routing_class(cls) if forced_routing else cls

    common = dict(
        model=model_name or settings.chat_model_name,
        temperature=settings.llm_temperature,
        max_retries=settings.llm_max_retries,
        rate_limiter=_rate_limiter(),
    )

    if settings.llm_provider == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI

        return build(ChatGoogleGenerativeAI)(google_api_key=_require(settings.google_api_key, "GOOGLE_API_KEY"), **common)

    from langchain_openai import ChatOpenAI

    return build(ChatOpenAI)(api_key=_require(settings.openai_api_key, "OPENAI_API_KEY"), **common)


@lru_cache
def get_embeddings() -> Embeddings:
    if settings.embeddings_provider == "google":
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        return GoogleGenerativeAIEmbeddings(
            model=settings.embeddings_model_name,
            google_api_key=_require(settings.google_api_key, "GOOGLE_API_KEY"),
            output_dimensionality=settings.embedding_dimensions,
        )

    from langchain_openai import OpenAIEmbeddings

    return OpenAIEmbeddings(
        model=settings.embeddings_model_name,
        api_key=_require(settings.openai_api_key, "OPENAI_API_KEY"),
        dimensions=settings.embedding_dimensions,
    )
