"""Read/write access to the AdminSetting key-value store.

Backs the admin panel's global switches (maintenance mode, signups on/off,
deck-type visibility overrides). Adding a new switch never needs a
migration — it's just a new key nobody has written yet, which get_setting's
default handles.
"""
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import AdminSetting


async def get_setting(db: AsyncSession, key: str, default: Any = None) -> Any:
    row = (
        await db.execute(select(AdminSetting).where(AdminSetting.key == key))
    ).scalar_one_or_none()
    return row.value if row is not None else default


async def set_setting(db: AsyncSession, key: str, value: Any, updated_by: Optional[str] = None) -> AdminSetting:
    row = (
        await db.execute(select(AdminSetting).where(AdminSetting.key == key))
    ).scalar_one_or_none()
    if row is None:
        row = AdminSetting(key=key, value=value, updated_by=updated_by)
        db.add(row)
    else:
        row.value = value
        row.updated_by = updated_by
    await db.flush()
    return row
