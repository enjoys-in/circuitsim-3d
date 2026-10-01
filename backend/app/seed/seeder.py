from __future__ import annotations

import asyncio

from app.core.logging import configure_logging, get_logger
from app.db.models.component import ComponentModel
from app.db.session import SessionFactory
from app.repositories.sql import SqlComponentRepository
from app.seed.catalog import CATALOG

logger = get_logger(__name__)

SYNCED_FIELDS = ("name", "category", "subcategory", "description", "pins", "default_params", "tags")


async def seed_components() -> tuple[int, int]:
    inserted = updated = 0
    async with SessionFactory() as session:
        repo = SqlComponentRepository(session)
        for entry in CATALOG:
            existing = await repo.get_by_key(str(entry["key"]))
            if existing is None:
                await repo.add(ComponentModel(**entry))
                inserted += 1
                continue
            changes = {f: entry[f] for f in SYNCED_FIELDS if getattr(existing, f) != entry[f]}
            if changes:
                for field, value in changes.items():
                    setattr(existing, field, value)
                updated += 1
        await session.commit()
    logger.info("Catalog synced: %d new, %d updated", inserted, updated)
    return inserted, updated


def main() -> None:
    configure_logging()
    asyncio.run(seed_components())


if __name__ == "__main__":
    main()
