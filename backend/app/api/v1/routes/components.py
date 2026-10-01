"""Component catalog endpoints."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import ComponentServiceDep
from app.core.exceptions import ConflictError, NotFoundError
from app.schemas.component import ComponentCreate, ComponentRead

router = APIRouter(prefix="/components", tags=["components"])


@router.get("", response_model=list[ComponentRead])
async def list_components(
    service: ComponentServiceDep,
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
) -> list[ComponentRead]:
    items = await service.list(category=category, search=search)
    return [ComponentRead.model_validate(i) for i in items]


@router.get("/{component_id}", response_model=ComponentRead)
async def get_component(
    component_id: uuid.UUID, service: ComponentServiceDep
) -> ComponentRead:
    try:
        return ComponentRead.model_validate(await service.get(component_id))
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.post("", response_model=ComponentRead, status_code=status.HTTP_201_CREATED)
async def create_component(
    payload: ComponentCreate, service: ComponentServiceDep
) -> ComponentRead:
    try:
        return ComponentRead.model_validate(await service.create(payload))
    except ConflictError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
