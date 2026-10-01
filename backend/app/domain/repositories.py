"""Abstract repository interfaces (Dependency Inversion Principle).

Services depend on these abstractions, never on concrete SQLAlchemy classes.
"""
from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Any

from app.db.models.component import ComponentModel
from app.db.models.project import ProjectModel
from app.db.models.simulation import SimulationRunModel


class ComponentRepository(ABC):
    @abstractmethod
    async def get(self, component_id: uuid.UUID) -> ComponentModel | None: ...

    @abstractmethod
    async def get_by_key(self, key: str) -> ComponentModel | None: ...

    @abstractmethod
    async def list(
        self, *, category: str | None = None, search: str | None = None
    ) -> list[ComponentModel]: ...

    @abstractmethod
    async def add(self, component: ComponentModel) -> ComponentModel: ...

    @abstractmethod
    async def count(self) -> int: ...


class ProjectRepository(ABC):
    @abstractmethod
    async def get(self, project_id: uuid.UUID) -> ProjectModel | None: ...

    @abstractmethod
    async def list(self) -> list[ProjectModel]: ...

    @abstractmethod
    async def add(self, project: ProjectModel) -> ProjectModel: ...

    @abstractmethod
    async def update(
        self, project: ProjectModel, changes: dict[str, Any]
    ) -> ProjectModel: ...

    @abstractmethod
    async def delete(self, project: ProjectModel) -> None: ...


class SimulationRepository(ABC):
    @abstractmethod
    async def get(self, run_id: uuid.UUID) -> SimulationRunModel | None: ...

    @abstractmethod
    async def add(self, run: SimulationRunModel) -> SimulationRunModel: ...

    @abstractmethod
    async def update(
        self, run: SimulationRunModel, changes: dict[str, Any]
    ) -> SimulationRunModel: ...
