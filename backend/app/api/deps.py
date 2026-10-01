"""FastAPI dependency wiring (composition root).

Keeps construction of repositories/services in one place so routes depend only
on abstractions and are trivial to test.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.engines.registry import EngineRegistry
from app.realtime.buffer import RealtimeBuffer
from app.realtime.hub import RealtimeHub
from app.realtime.store import RealtimeStore
from app.repositories.sql import (
    SqlComponentRepository,
    SqlProjectRepository,
)
from app.services.component_service import ComponentService
from app.services.project_service import ProjectService
from app.services.simulation_service import SimulationService

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_component_service(session: SessionDep) -> ComponentService:
    return ComponentService(SqlComponentRepository(session))


def get_project_service(session: SessionDep) -> ProjectService:
    return ProjectService(SqlProjectRepository(session))


def get_engine_registry(request: Request) -> EngineRegistry:
    return request.app.state.engine_registry


def get_simulation_service(
    registry: Annotated[EngineRegistry, Depends(get_engine_registry)],
) -> SimulationService:
    return SimulationService(registry)


def get_buffer(request: Request) -> RealtimeBuffer:
    return request.app.state.realtime_buffer


def get_hub(request: Request) -> RealtimeHub:
    return request.app.state.realtime_hub


def get_realtime_store(request: Request) -> RealtimeStore:
    return request.app.state.realtime_store


ComponentServiceDep = Annotated[ComponentService, Depends(get_component_service)]
ProjectServiceDep = Annotated[ProjectService, Depends(get_project_service)]
SimulationServiceDep = Annotated[SimulationService, Depends(get_simulation_service)]
BufferDep = Annotated[RealtimeBuffer, Depends(get_buffer)]
HubDep = Annotated[RealtimeHub, Depends(get_hub)]
RealtimeStoreDep = Annotated[RealtimeStore, Depends(get_realtime_store)]
