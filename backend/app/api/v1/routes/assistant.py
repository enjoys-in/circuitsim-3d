"""AI assistant chat endpoint (builds/edits circuits via an LLM)."""
from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse

from app.schemas.assistant import AssistantProviders, AssistantRequest, AssistantResponse
from app.services.assistant_service import AssistantService

router = APIRouter(prefix="/assistant", tags=["assistant"])


@lru_cache
def _service() -> AssistantService:
    return AssistantService()


@router.get("/status")
async def status() -> dict[str, object]:
    return _service().active_info()


@router.get("/providers", response_model=AssistantProviders)
async def providers() -> AssistantProviders:
    return AssistantProviders(**_service().available())


@router.post("/chat", response_model=AssistantResponse)
async def chat(payload: AssistantRequest) -> AssistantResponse:
    result = await run_in_threadpool(
        _service().chat,
        [m.model_dump() for m in payload.messages],
        payload.circuit,
        payload.provider,
        payload.model,
    )
    return AssistantResponse(**result)


@router.post("/chat/stream")
async def chat_stream(payload: AssistantRequest) -> StreamingResponse:
    """Server-Sent Events: `token` events as the reply types, then a final `done` event."""
    stream = _service().stream_chat(
        [m.model_dump() for m in payload.messages],
        payload.circuit,
        payload.provider,
        payload.model,
    )
    return StreamingResponse(
        stream,
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
