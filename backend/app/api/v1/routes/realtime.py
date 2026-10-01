"""Realtime REST endpoints for reading buffered snapshots."""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.deps import RealtimeStoreDep

router = APIRouter(prefix="/realtime", tags=["realtime"])


@router.get("/{channel}")
async def latest_snapshots(
    channel: str,
    store: RealtimeStoreDep,
    limit: int = Query(default=50, ge=1, le=500),
) -> dict[str, object]:
    snapshots = await store.latest(channel, limit=limit)
    return {
        "channel": channel,
        "snapshots": [
            {"payload": s.payload, "created_at": s.created_at} for s in snapshots
        ],
    }
