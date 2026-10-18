"""
app/core/config.py – Central, typed configuration loaded from environment variables / .env.

Every setting can be overridden with an environment variable of the same name
(case-insensitive). A few legacy names from the old Flask backend are accepted as
aliases (GEMINI_API_KEY, GEMINI_MODEL, PYTHON_PORT, CLIENT_URL) so an existing .env
keeps working.
"""

from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── Server ─────────────────────────────────────────────────────────────────
    app_env: str = Field("development", validation_alias=AliasChoices("APP_ENV", "NODE_ENV"))
    port: int = Field(5000, validation_alias=AliasChoices("PORT", "PYTHON_PORT"))
    # Comma-separated list of allowed browser origins
    cors_origins: str = Field(
        "http://localhost:5173",
        validation_alias=AliasChoices("CORS_ORIGINS", "CLIENT_URL"),
    )

    # ── MongoDB ────────────────────────────────────────────────────────────────
    mongodb_uri: str = "mongodb://localhost:27017/ai-devflow"
    # Database name; defaults to the one in the URI path, else "ai-devflow"
    mongodb_db: str | None = None

    # ── Firebase Admin ─────────────────────────────────────────────────────────
    firebase_project_id: str = ""
    # Either a path to the service-account JSON file, or the JSON itself (useful on PaaS)
    firebase_credentials_path: str | None = None
    firebase_credentials_json: str | None = None

    # ── LLM ────────────────────────────────────────────────────────────────────
    llm_provider: Literal["google", "openai"] = "google"
    llm_model: str | None = Field(None, validation_alias=AliasChoices("LLM_MODEL", "GEMINI_MODEL"))
    # Optional cheaper/faster model for the routing supervisor (defaults to llm_model)
    supervisor_model: str | None = None
    llm_temperature: float = 0.2
    llm_max_retries: int = 6
    # Client-side throttle per model (0 = off). Set to 5 on the Gemini free tier.
    llm_requests_per_minute: float = 0
    # Comma-separated models to switch to when a model is out of quota / overloaded.
    # Empty = a sensible default list for the provider; "none" disables fallback.
    llm_fallback_models: str = ""
    google_api_key: str = Field("", validation_alias=AliasChoices("GOOGLE_API_KEY", "GEMINI_API_KEY"))
    openai_api_key: str = ""

    # ── Embeddings / RAG ───────────────────────────────────────────────────────
    embedding_provider: Literal["google", "openai"] | None = None  # defaults to llm_provider
    embedding_model: str | None = None
    embedding_dimensions: int = 768
    vector_index_name: str = "document_chunks_vector_index"
    rag_chunk_size: int = 1000
    rag_chunk_overlap: int = 150
    rag_top_k: int = 6
    max_upload_mb: int = 20

    # ── Derived helpers ────────────────────────────────────────────────────────
    @property
    def is_dev(self) -> bool:
        return self.app_env.lower() == "development"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def database_name(self) -> str:
        if self.mongodb_db:
            return self.mongodb_db
        path = self.mongodb_uri.split("://", 1)[-1].split("/", 1)
        name = path[1].split("?", 1)[0] if len(path) > 1 else ""
        return name or "ai-devflow"

    @property
    def fallback_model_names(self) -> list[str]:
        raw = self.llm_fallback_models.strip()
        if raw.lower() == "none":
            return []
        if not raw:
            raw = (
                "gemini-3.8-flash,gemini-3-flash-preview,gemini-flash-lite-latest,gemini-3.1-flash-lite"
                if self.llm_provider == "google" else "gpt-4o-mini,gpt-4.1-mini"
            )
        return [m.strip() for m in raw.split(",") if m.strip()]

    @property
    def chat_model_name(self) -> str:
        if self.llm_model:
            return self.llm_model
        return "gemini-3.5-flash" if self.llm_provider == "google" else "gpt-4o-mini"

    @property
    def embeddings_provider(self) -> str:
        return self.embedding_provider or self.llm_provider

    @property
    def embeddings_model_name(self) -> str:
        if self.embedding_model:
            return self.embedding_model
        return "gemini-embedding-001" if self.embeddings_provider == "google" else "text-embedding-3-small"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
