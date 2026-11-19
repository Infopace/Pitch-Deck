"""
Deck-type catalogue endpoint.

The new-project form renders its deck-type picker and its per-type fields from
this response rather than from a hard-coded copy of the registry, so the form
cannot drift from what the generation prompt actually consumes.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_settings import get_setting
from app.db.session import get_db
from app.decks.registry import serialize_deck_types

router = APIRouter()


@router.get("")
async def list_deck_types(db: AsyncSession = Depends(get_db)) -> dict:
    """Every deck type: label, description, slide count, and its intake fields."""
    overrides = await get_setting(db, "deck_type_overrides", None)
    return {"data": serialize_deck_types(overrides)}
