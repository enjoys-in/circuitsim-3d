"""Application configuration loaded from environment variables."""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "CircuitSim API"
    app_version: str = "0.1.0"
    environment: str = "development"
    api_v1_prefix: str = "/v1/api"

    # Durable relational store
    postgres_dsn: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/circuitsim"

    # Realtime fast store (local SQLite buffer flushed every few seconds)
    realtime_db_path: str = "./data/realtime.db"
    realtime_flush_interval: float = 3.0

    # Frontend build served at "/"
    static_dir: str = "dist"

    cors_origins: list[str] = ["*"]

    # Local-network access: when the agent is reachable beyond localhost,
    # require a pairing token from non-local clients.
    lan_enabled: bool = False
    pairing_token: str | None = None

    # AI assistant: choose a provider ("auto" picks the first key found) and an optional
    # model override. Keys are read from env; never hardcoded.
    ai_provider: str = "auto"
    ai_model: str | None = None
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"
    anthropic_api_key: str | None = None
    groq_api_key: str | None = None
    open_router_key: str | None = None
    mistral_api_key: str | None = None
    gemini_api_key: str | None = None
    nvidia_api_key: str | None = None

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
