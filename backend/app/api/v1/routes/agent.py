"""Agent identity & capability endpoint (used by the browser for discovery)."""
from __future__ import annotations

from fastapi import APIRouter, Request

from app.agent.capabilities import detect_native_tools, system_info
from app.core.config import get_settings
from app.schemas.agent import AgentInfo

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/info", response_model=AgentInfo)
async def agent_info(request: Request) -> AgentInfo:
    settings = get_settings()
    registry = request.app.state.engine_registry
    return AgentInfo(
        name=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
        api_prefix=settings.api_v1_prefix,
        system=system_info(),
        engines=registry.names(),
        native_tools=detect_native_tools(),
        features=["simulation", "projects", "realtime"],
        pairing_required=bool(settings.lan_enabled and settings.pairing_token),
    )
