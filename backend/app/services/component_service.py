"""Business logic for the component catalog."""
from __future__ import annotations

import uuid

from app.core.exceptions import ConflictError, NotFoundError
from app.db.models.component import ComponentModel
from app.domain.repositories import ComponentRepository
from app.schemas.component import ComponentCreate


class ComponentService:
    def __init__(self, repository: ComponentRepository) -> None:
        self._repo = repository

    async def list(
        self, *, category: str | None = None, search: str | None = None
    ) -> list[ComponentModel]:
        return await self._repo.list(category=category, search=search)

    async def get(self, component_id: uuid.UUID) -> ComponentModel:
        component = await self._repo.get(component_id)
        if component is None:
            raise NotFoundError(f"Component {component_id} not found")
        return component

    async def create(self, data: ComponentCreate) -> ComponentModel:
        if await self._repo.get_by_key(data.key) is not None:
            raise ConflictError(f"Component key '{data.key}' already exists")
        model = ComponentModel(
            key=data.key,
            name=data.name,
            category=data.category.value,
            subcategory=data.subcategory,
            description=data.description,
            pins=[p.model_dump() for p in data.pins],
            default_params=data.default_params,
            spice_model=data.spice_model,
            footprint=data.footprint,
            symbol=data.symbol,
            tags=data.tags,
        )
        return await self._repo.add(model)
