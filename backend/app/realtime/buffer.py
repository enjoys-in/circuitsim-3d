"""In-memory realtime buffer.

Producers push snapshots here on every tick; the flusher drains it to the
SQLite fast-store periodically so writes are batched instead of per-event.
"""
from __future__ import annotations

import asyncio
from typing import Any

from app.realtime.store import Snapshot, utc_now_iso


class RealtimeBuffer:
    def __init__(self) -> None:
        self._pending: list[Snapshot] = []
        self._latest: dict[str, Snapshot] = {}
        self._lock = asyncio.Lock()

    async def push(self, channel: str, payload: dict[str, Any]) -> Snapshot:
        snapshot = Snapshot(
            channel=channel, payload=payload, created_at=utc_now_iso()
        )
        async with self._lock:
            self._pending.append(snapshot)
            self._latest[channel] = snapshot
        return snapshot

    async def drain(self) -> list[Snapshot]:
        async with self._lock:
            pending, self._pending = self._pending, []
        return pending

    def latest(self, channel: str) -> Snapshot | None:
        return self._latest.get(channel)
