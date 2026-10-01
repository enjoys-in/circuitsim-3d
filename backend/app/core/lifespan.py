"""Application lifespan: wire singletons and background tasks."""
from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import get_settings
from app.core.logging import get_logger
from app.db.base import Base
from app.db.session import engine
from app.engines import build_default_registry
from app.realtime.buffer import RealtimeBuffer
from app.realtime.flusher import RealtimeFlusher
from app.realtime.hub import RealtimeHub
from app.realtime.store import RealtimeStore
from app.seed.seeder import seed_components

logger = get_logger(__name__)


async def _create_tables() -> None:
    # Import models so their metadata is registered before create_all.
    import app.db.models  # noqa: F401

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables ensured")
    except Exception as exc:  # pragma: no cover - dev resilience
        logger.warning("Skipping table creation (DB unavailable): %s", exc)
        return
    try:
        await seed_components()
    except Exception as exc:  # pragma: no cover - dev resilience
        logger.warning("Skipping catalog sync: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()

    app.state.engine_registry = build_default_registry()
    app.state.realtime_buffer = RealtimeBuffer()
    app.state.realtime_hub = RealtimeHub()
    app.state.realtime_store = RealtimeStore(settings.realtime_db_path)
    app.state.realtime_flusher = RealtimeFlusher(
        app.state.realtime_buffer,
        app.state.realtime_store,
        interval=settings.realtime_flush_interval,
    )

    await _create_tables()
    await app.state.realtime_flusher.start()
    try:
        yield
    finally:
        await app.state.realtime_flusher.stop()
        await engine.dispose()
