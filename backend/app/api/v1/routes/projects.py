"""Design project endpoints."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.deps import ProjectServiceDep
from app.core.exceptions import NotFoundError
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectRead])
async def list_projects(service: ProjectServiceDep) -> list[ProjectRead]:
    return [ProjectRead.model_validate(p) for p in await service.list()]


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate, service: ProjectServiceDep
) -> ProjectRead:
    return ProjectRead.model_validate(await service.create(payload))


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: uuid.UUID, service: ProjectServiceDep
) -> ProjectRead:
    try:
        return ProjectRead.model_validate(await service.get(project_id))
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: uuid.UUID, payload: ProjectUpdate, service: ProjectServiceDep
) -> ProjectRead:
    try:
        return ProjectRead.model_validate(await service.update(project_id, payload))
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID, service: ProjectServiceDep
) -> None:
    try:
        await service.delete(project_id)
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
