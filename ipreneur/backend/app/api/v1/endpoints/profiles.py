"""Company profile endpoints — the master parameter set behind every deck.

The profile is per-company and outlives any one project, which is the whole
point: a founder answers once, then every deck type selects from the same facts
instead of asking again.
"""
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.db.session import get_db
from app.models.models import CompanyProfile, User
from app.profile.parameters import PARAMETER_GROUPS, PARAMETERS
from app.profile.relevance import param_relevance, relevance_for
from app.profile.values import ProfileValues, completeness, derive, missing_required

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class ProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    values: dict[str, Any] = {}


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    #: Partial merge, never a whole-blob replace — two browser tabs editing
    #: different groups must not clobber each other.
    values: dict[str, Any] = {}
    #: Provenance for values that don't carry their own.
    source: str = "founder"


def _serialize(profile: CompanyProfile, deck_type: Optional[str] = None,
               stage: Optional[str] = None) -> dict:
    values = ProfileValues.load(profile.values)
    groups = completeness(values, deck_type, stage=stage)
    filled = sum(g.filled for g in groups)
    total = sum(g.total for g in groups)
    return {
        "id": profile.id,
        "name": profile.name,
        "values": values.dump(),
        "completeness": {
            "filled": filled,
            "total": total,
            "pct": round(100 * filled / total) if total else 0,
            "groups": [
                {"key": g.key, "label": g.label, "relevance": g.relevance,
                 "filled": g.filled, "total": g.total, "pct": g.pct,
                 "required_filled": g.required_filled,
                 "required_total": g.required_total,
                 "missing_required": g.missing_required}
                for g in groups
            ],
        },
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


async def _owned(profile_id: str, user: User, db: AsyncSession) -> CompanyProfile:
    profile = await db.get(CompanyProfile, profile_id)
    if profile is None or profile.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")
    return profile


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/schema")
async def get_schema(
    deck_type: Optional[str] = Query(default=None),
    stage: Optional[str] = Query(default=None),
):
    """The parameter catalogue, filtered to what one deck type consumes.

    This is what the profile form renders from, so the form can never drift
    from what the prompt actually reads.
    """
    groups = []
    for key, group in PARAMETER_GROUPS.items():
        # With no deck type the caller wants the whole catalogue (the profile
        # page's own view). Relevance is only meaningful relative to a deck, and
        # filtering on it here would return almost nothing, since every group
        # resolves to "N" for a null deck type.
        rel = relevance_for(deck_type, key, stage=stage) if deck_type else "O"
        if deck_type and rel == "N":
            continue
        params = []
        for p in group.params:
            prel = param_relevance(deck_type, p.name, stage=stage) if deck_type else "O"
            if prel == "N":
                continue
            params.append({
                "name": p.name, "label": p.label, "type": p.type,
                "help": p.help, "unit": p.unit,
                "options": list(p.options), "relevance": prel,
                "derived_from": list(p.derived_from),
            })
        if params:
            groups.append({"key": key, "label": group.label,
                           "order": group.order, "relevance": rel,
                           "params": params})
    return {"data": {"groups": groups, "parameter_count": len(PARAMETERS)}}


@router.get("")
async def list_profiles(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(CompanyProfile)
        .where(CompanyProfile.user_id == user.id)
        .order_by(CompanyProfile.updated_at.desc())
    )).scalars().all()
    return {"data": [_serialize(p) for p in rows]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_profile(
    payload: ProfileCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # derive() here as well as in PATCH: a profile created with cac+ltv must come
    # back with ltv_cac already computed, not wait for an unrelated later edit.
    values = derive(ProfileValues().merge(payload.values, source="founder"))
    profile = CompanyProfile(user_id=user.id, name=payload.name.strip(),
                             values=values.dump())
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return {"data": _serialize(profile)}


@router.get("/{profile_id}")
async def get_profile(
    profile_id: str,
    deck_type: Optional[str] = Query(default=None),
    stage: Optional[str] = Query(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return {"data": _serialize(await _owned(profile_id, user, db), deck_type, stage)}


@router.patch("/{profile_id}")
async def update_profile(
    profile_id: str,
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await _owned(profile_id, user, db)
    if payload.name is not None and payload.name.strip():
        profile.name = payload.name.strip()

    unknown = [k for k in payload.values if k not in PARAMETERS]
    if unknown:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"Unknown parameters: {', '.join(sorted(unknown)[:10])}",
        )

    values = ProfileValues.load(profile.values).merge(payload.values, source=payload.source)
    profile.values = derive(values).dump()
    await db.commit()
    await db.refresh(profile)
    return {"data": _serialize(profile)}


@router.get("/{profile_id}/readiness")
async def get_readiness(
    profile_id: str,
    deck_type: str = Query(...),
    stage: Optional[str] = Query(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """What this profile still needs before it can produce a given deck type."""
    profile = await _owned(profile_id, user, db)
    values = ProfileValues.load(profile.values)
    missing = missing_required(values, deck_type, stage=stage)
    return {"data": {
        "deck_type": deck_type,
        "ready": not missing,
        "missing_required": [
            {"name": n, "label": PARAMETERS[n].label, "type": PARAMETERS[n].type,
             "group": PARAMETERS[n].group, "help": PARAMETERS[n].help}
            for n in missing if n in PARAMETERS
        ],
    }}


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    profile_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await _owned(profile_id, user, db)
    await db.delete(profile)
    await db.commit()
