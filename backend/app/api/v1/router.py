"""Aggregate all v1 routers under the API prefix."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import (
    agent,
    components,
    health,
    projects,
    realtime,
    realtime_ws,
    simulation,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(agent.router)
api_router.include_router(components.router)
api_router.include_router(projects.router)
api_router.include_router(simulation.router)
api_router.include_router(realtime.router)
api_router.include_router(realtime_ws.router)
