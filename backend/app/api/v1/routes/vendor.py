"""On-demand vendor catalog: browse/search the scraped robu.in parts and import
a chosen one into the live component catalog so the UI can place it."""
from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import SessionDep
from app.db.models.component import ComponentModel
from app.repositories.sql import SqlComponentRepository
from app.schemas.component import ComponentRead
from app.schemas.vendor import (
    VendorCategories,
    VendorImportRequest,
    VendorProductPage,
)
from app.services.vendor_catalog import VendorCatalogService

router = APIRouter(prefix="/vendor", tags=["vendor"])


@lru_cache
def _service() -> VendorCatalogService:
    return VendorCatalogService()


@router.get("/categories", response_model=VendorCategories)
async def categories() -> VendorCategories:
    return VendorCategories(**_service().categories())


@router.get("/products", response_model=VendorProductPage)
async def products(
    category: str | None = Query(default=None),
    q: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
) -> VendorProductPage:
    result = _service().search(category=category, query=q, page=page, page_size=page_size)
    return VendorProductPage(**result)


@router.post("/import", response_model=ComponentRead, status_code=status.HTTP_201_CREATED)
async def import_product(payload: VendorImportRequest, session: SessionDep) -> ComponentRead:
    service = _service()
    product = service.get(payload.id)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Product '{payload.id}' not found")

    fields = service.to_component(product)
    repo = SqlComponentRepository(session)
    existing = await repo.get_by_key(fields["key"])
    if existing is not None:
        return ComponentRead.model_validate(existing)

    model = await repo.add(ComponentModel(**fields))
    await session.commit()
    return ComponentRead.model_validate(model)
