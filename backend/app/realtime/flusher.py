"""Periodic flusher: drains the realtime buffer to the SQLite store."""
from __future__ import annotations

import asyncio
import contextlib

from app.core.logging import get_logger
from app.realtime.buffer import RealtimeBuffer
from app.realtime.store import RealtimeStore

logger = get_logger(__name__)


class RealtimeFlusher:
    def __init__(
        self,
        buffer: RealtimeBuffer,
        store: RealtimeStore,
        interval: float = 3.0,
    ) -> None:
        self._buffer = buffer
        self._store = store
        self._interval = interval
        self._task: asyncio.Task[None] | None = None
        self._stopping = asyncio.Event()

    async def start(self) -> None:
        await self._store.init()
        self._stopping.clear()
        self._task = asyncio.create_task(self._loop(), name="realtime-flusher")
        logger.info("Realtime flusher started (interval=%.1fs)", self._interval)

    async def stop(self) -> None:
        self._stopping.set()
        if self._task is not None:
            await self._task
            self._task = None
        await self._flush_once()  # final drain
        logger.info("Realtime flusher stopped")

    async def _loop(self) -> None:
        while not self._stopping.is_set():
            with contextlib.suppress(TimeoutError):
                await asyncio.wait_for(self._stopping.wait(), timeout=self._interval)
            await self._flush_once()

    async def _flush_once(self) -> None:
        snapshots = await self._buffer.drain()
        if snapshots:
            await self._store.write_many(snapshots)
            logger.debug("Flushed %d snapshot(s)", len(snapshots))
