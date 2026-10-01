"""DTOs for the on-demand vendor (robu.in) catalog."""
from __future__ import annotations

from pydantic import BaseModel, Field


class VendorCategory(BaseModel):
    name: str
    count: int


class VendorCategories(BaseModel):
    available: bool
    total: int
    categories: list[VendorCategory] = Field(default_factory=list)


class VendorProduct(BaseModel):
    id: str
    name: str
    sku: str | None = None
    slug: str | None = None
    url: str | None = None
    price: float | None = None
    sale_price: float | None = None
    in_stock: bool | None = None
    image: str | None = None
    categories: list[str] = Field(default_factory=list)


class VendorProductPage(BaseModel):
    items: list[VendorProduct]
    total: int
    page: int
    page_size: int
    pages: int


class VendorImportRequest(BaseModel):
    id: str
