"""AI assistant chat endpoint (builds/edits circuits via an LLM)."""
from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool

from app.schemas.assistant import AssistantRequest, AssistantResponse
from app.services.assistant_service import AssistantService

router = APIRouter(prefix="/assistant", tags=["assistant"])


@lru_cache
def _service() -> AssistantService:
    return AssistantService()


@router.get("/status")
async def status() -> dict[str, object]:
    return _service().active_info()


@router.post("/chat", response_model=AssistantResponse)
async def chat(payload: AssistantRequest) -> AssistantResponse:
    result = await run_in_threadpool(
        _service().chat, [m.model_dump() for m in payload.messages], payload.circuit
    )
    return AssistantResponse(**result)
