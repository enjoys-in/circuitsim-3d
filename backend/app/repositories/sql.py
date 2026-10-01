"""SQLAlchemy implementations of the repository interfaces."""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.component import ComponentModel
from app.db.models.project import ProjectModel
from app.db.models.simulation import SimulationRunModel
from app.domain.repositories import (
    ComponentRepository,
    ProjectRepository,
    SimulationRepository,
)


class SqlComponentRepository(ComponentRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, component_id: uuid.UUID) -> ComponentModel | None:
        return await self._session.get(ComponentModel, component_id)

    async def get_by_key(self, key: str) -> ComponentModel | None:
        stmt = select(ComponentModel).where(ComponentModel.key == key)
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def list(
        self, *, category: str | None = None, search: str | None = None
    ) -> list[ComponentModel]:
        stmt = select(ComponentModel)
        if category:
            stmt = stmt.where(ComponentModel.category == category)
        if search:
            pattern = f"%{search.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(ComponentModel.name).like(pattern),
                    func.lower(ComponentModel.key).like(pattern),
                )
            )
        stmt = stmt.order_by(ComponentModel.category, ComponentModel.name)
        return list((await self._session.execute(stmt)).scalars().all())

    async def add(self, component: ComponentModel) -> ComponentModel:
        self._session.add(component)
        await self._session.flush()
        return component

    async def count(self) -> int:
        stmt = select(func.count()).select_from(ComponentModel)
        return int((await self._session.execute(stmt)).scalar_one())


class SqlProjectRepository(ProjectRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, project_id: uuid.UUID) -> ProjectModel | None:
        return await self._session.get(ProjectModel, project_id)

    async def list(self) -> list[ProjectModel]:
        stmt = select(ProjectModel).order_by(ProjectModel.updated_at.desc())
        return list((await self._session.execute(stmt)).scalars().all())

    async def add(self, project: ProjectModel) -> ProjectModel:
        self._session.add(project)
        await self._session.flush()
        return project

    async def update(
        self, project: ProjectModel, changes: dict[str, Any]
    ) -> ProjectModel:
        for field, value in changes.items():
            setattr(project, field, value)
        await self._session.flush()
        # onupdate=func.now() expires updated_at; reload it inside the async context
        # so later (sync) serialization does not trigger a lazy refresh (MissingGreenlet).
        await self._session.refresh(project)
        return project

    async def delete(self, project: ProjectModel) -> None:
        await self._session.delete(project)
        await self._session.flush()


class SqlSimulationRepository(SimulationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, run_id: uuid.UUID) -> SimulationRunModel | None:
        return await self._session.get(SimulationRunModel, run_id)

    async def add(self, run: SimulationRunModel) -> SimulationRunModel:
        self._session.add(run)
        await self._session.flush()
        return run

    async def update(
        self, run: SimulationRunModel, changes: dict[str, Any]
    ) -> SimulationRunModel:
        for field, value in changes.items():
            setattr(run, field, value)
        await self._session.flush()
        return run
