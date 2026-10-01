"""Local SQLite fast-store for realtime snapshots.

This is the lightweight buffer store (the "tiny db") that captures live
simulation/sensor state. Durable domain data lives in Postgres instead.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import aiosqlite

_SCHEMA = """
CREATE TABLE IF NOT EXISTS snapshots (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    channel    TEXT NOT NULL,
    payload    TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snapshots_channel ON snapshots(channel, id DESC);
"""


@dataclass(slots=True)
class Snapshot:
    channel: str
    payload: dict[str, Any]
    created_at: str


class RealtimeStore:
    def __init__(self, db_path: str) -> None:
        self._db_path = db_path

    async def init(self) -> None:
        directory = os.path.dirname(self._db_path)
        if directory:
            os.makedirs(directory, exist_ok=True)
        async with aiosqlite.connect(self._db_path) as db:
            await db.executescript(_SCHEMA)
            await db.commit()

    async def write_many(self, snapshots: list[Snapshot]) -> None:
        if not snapshots:
            return
        rows = [
            (s.channel, json.dumps(s.payload), s.created_at) for s in snapshots
        ]
        async with aiosqlite.connect(self._db_path) as db:
            await db.executemany(
                "INSERT INTO snapshots(channel, payload, created_at) VALUES (?, ?, ?)",
                rows,
            )
            await db.commit()

    async def latest(self, channel: str, limit: int = 50) -> list[Snapshot]:
        async with aiosqlite.connect(self._db_path) as db:
            cursor = await db.execute(
                "SELECT channel, payload, created_at FROM snapshots "
                "WHERE channel = ? ORDER BY id DESC LIMIT ?",
                (channel, limit),
            )
            rows = await cursor.fetchall()
        return [
            Snapshot(channel=r[0], payload=json.loads(r[1]), created_at=r[2])
            for r in rows
        ]


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()
