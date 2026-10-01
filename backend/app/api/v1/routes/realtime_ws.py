"""Realtime WebSocket endpoint.

Clients stream live values (e.g. virtual sensor readings, sim ticks). Each
message is pushed into the buffer (persisted to SQLite every few seconds) and
broadcast to all other connected clients.
"""
from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.deps import get_buffer, get_hub

router = APIRouter()


@router.websocket("/ws/realtime")
async def realtime_ws(websocket: WebSocket) -> None:
    hub = get_hub(websocket)
    buffer = get_buffer(websocket)
    await hub.connect(websocket)
    try:
        while True:
            message = await websocket.receive_json()
            channel = str(message.get("channel", "default"))
            payload = message.get("payload", {})
            snapshot = await buffer.push(channel, payload)
            await hub.broadcast(
                {
                    "channel": snapshot.channel,
                    "payload": snapshot.payload,
                    "created_at": snapshot.created_at,
                }
            )
    except WebSocketDisconnect:
        await hub.disconnect(websocket)
