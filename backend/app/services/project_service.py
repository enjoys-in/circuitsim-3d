"""Business logic for design projects."""
from __future__ import annotations

import uuid

from app.core.exceptions import NotFoundError
from app.db.models.project import ProjectModel
from app.domain.repositories import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    def __init__(self, repository: ProjectRepository) -> None:
        self._repo = repository

    async def list(self) -> list[ProjectModel]:
        return await self._repo.list()

    async def get(self, project_id: uuid.UUID) -> ProjectModel:
        project = await self._repo.get(project_id)
        if project is None:
            raise NotFoundError(f"Project {project_id} not found")
        return project

    async def create(self, data: ProjectCreate) -> ProjectModel:
        model = ProjectModel(
            name=data.name,
            description=data.description,
            circuit=data.circuit.model_dump(),
        )
        return await self._repo.add(model)

    async def update(self, project_id: uuid.UUID, data: ProjectUpdate) -> ProjectModel:
        project = await self.get(project_id)
        changes: dict[str, object] = {}
        if data.name is not None:
            changes["name"] = data.name
        if data.description is not None:
            changes["description"] = data.description
        if data.circuit is not None:
            changes["circuit"] = data.circuit.model_dump()
        if not changes:
            return project
        return await self._repo.update(project, changes)

    async def delete(self, project_id: uuid.UUID) -> None:
        project = await self.get(project_id)
        await self._repo.delete(project)
