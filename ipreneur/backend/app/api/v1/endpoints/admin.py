"""
Admin panel endpoints — dashboard stats, the login/deck/payment activity
feed, user management, the purchase ledger, deck oversight, and global
settings. Every route requires app.api.deps.auth.require_admin.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import require_admin
from app.core.admin_events import log_event
from app.core.admin_settings import get_setting, set_setting
from app.db.session import get_db
from app.decks.registry import DECK_TYPES
from app.models.models import AdminEvent, DeckCredit, Job, Payment, Presentation, Project, User

router = APIRouter()

_KNOWN_SETTINGS = {"maintenance_mode", "signups_enabled", "deck_type_overrides"}
_SETTING_DEFAULTS: dict[str, Any] = {
    "maintenance_mode": False,
    "signups_enabled": True,
    "deck_type_overrides": None,
}


def _deck_label(deck_type: str) -> str:
    dt = DECK_TYPES.get(deck_type)
    return dt.label if dt else deck_type


# ── Overview ─────────────────────────────────────────────────────────────────

class OverviewStats(BaseModel):
    total_users: int
    new_users_today: int
    new_users_week: int
    total_projects: int
    projects_by_status: dict[str, int]
    revenue_inr_today: int
    revenue_inr_week: int
    revenue_inr_month: int
    revenue_inr_all_time: int
    revenue_by_day: list[dict]
    revenue_by_deck_type: list[dict]


@router.get("/overview", response_model=OverviewStats)
async def get_overview(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> OverviewStats:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    d7 = now - timedelta(days=7)
    d30 = now - timedelta(days=30)

    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    new_today = (
        await db.execute(select(func.count(User.id)).where(User.created_at >= today_start))
    ).scalar_one()
    new_week = (
        await db.execute(select(func.count(User.id)).where(User.created_at >= d7))
    ).scalar_one()

    total_projects = (
        await db.execute(select(func.count(Project.id)).where(Project.is_deleted.is_(False)))
    ).scalar_one()
    status_rows = (
        await db.execute(
            select(Project.status, func.count(Project.id))
            .where(Project.is_deleted.is_(False))
            .group_by(Project.status)
        )
    ).all()

    async def _revenue_since(since: datetime) -> int:
        total = (
            await db.execute(select(func.coalesce(func.sum(Payment.amount_inr), 0)).where(Payment.created_at >= since))
        ).scalar_one()
        return int(total)

    revenue_today = await _revenue_since(today_start)
    revenue_week = await _revenue_since(d7)
    revenue_month = await _revenue_since(d30)
    revenue_all = int((await db.execute(select(func.coalesce(func.sum(Payment.amount_inr), 0)))).scalar_one())

    by_day_rows = (
        await db.execute(
            select(func.date(Payment.created_at), func.sum(Payment.amount_inr))
            .where(Payment.created_at >= d30)
            .group_by(func.date(Payment.created_at))
            .order_by(func.date(Payment.created_at))
        )
    ).all()
    by_type_rows = (
        await db.execute(
            select(Payment.deck_type, func.sum(Payment.amount_inr), func.count(Payment.id))
            .group_by(Payment.deck_type)
            .order_by(func.sum(Payment.amount_inr).desc())
        )
    ).all()

    return OverviewStats(
        total_users=total_users,
        new_users_today=new_today,
        new_users_week=new_week,
        total_projects=total_projects,
        projects_by_status={s: c for s, c in status_rows},
        revenue_inr_today=revenue_today,
        revenue_inr_week=revenue_week,
        revenue_inr_month=revenue_month,
        revenue_inr_all_time=revenue_all,
        revenue_by_day=[{"date": str(d), "revenue_inr": int(total)} for d, total in by_day_rows],
        revenue_by_deck_type=[
            {"deck_type": dt, "label": _deck_label(dt), "revenue_inr": int(total), "count": count}
            for dt, total, count in by_type_rows
        ],
    )


# ── Activity feed (notifications + audit trail) ─────────────────────────────

class EventRow(BaseModel):
    id: str
    type: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    summary: str
    meta: Optional[dict] = None
    created_at: str


@router.get("/events", response_model=list[EventRow])
async def list_events(
    type: Optional[str] = Query(None),
    since: Optional[datetime] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[EventRow]:
    query = select(AdminEvent, User.email).outerjoin(User, User.id == AdminEvent.user_id)
    if type:
        query = query.where(AdminEvent.type == type)
    if since:
        query = query.where(AdminEvent.created_at > since)
    query = query.order_by(AdminEvent.created_at.desc()).limit(limit)

    rows = (await db.execute(query)).all()
    return [
        EventRow(
            id=event.id,
            type=event.type,
            user_id=event.user_id,
            user_email=email,
            summary=event.summary,
            meta=event.meta,
            created_at=event.created_at.isoformat(),
        )
        for event, email in rows
    ]


# ── Users ────────────────────────────────────────────────────────────────────

class UserRow(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    is_verified: bool
    is_billing_exempt: bool
    created_at: str
    deck_count: int
    total_spend_inr: int


class UserListResponse(BaseModel):
    data: list[UserRow]
    total: int
    page: int
    page_size: int


@router.get("/users", response_model=UserListResponse)
async def list_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    created_since: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserListResponse:
    deck_count_subq = (
        select(func.count(Project.id))
        .where(Project.user_id == User.id, Project.is_deleted.is_(False))
        .correlate(User)
        .scalar_subquery()
    )
    spend_subq = (
        select(func.coalesce(func.sum(Payment.amount_inr), 0))
        .where(Payment.user_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )

    query = select(User, deck_count_subq, spend_subq)
    if search:
        like = f"%{search.lower()}%"
        query = query.where(func.lower(User.email).like(like) | func.lower(User.name).like(like))
    if role:
        query = query.where(User.role == role)
    if created_since:
        query = query.where(User.created_at >= created_since)

    total = (await db.execute(select(func.count()).select_from(query.with_only_columns(User.id).subquery()))).scalar_one()

    query = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(query)).all()

    return UserListResponse(
        data=[
            UserRow(
                id=user.id, email=user.email, name=user.name, role=user.role,
                is_active=user.is_active, is_verified=user.is_verified,
                is_billing_exempt=user.is_billing_exempt,
                created_at=user.created_at.isoformat(),
                deck_count=deck_count, total_spend_inr=int(spend),
            )
            for user, deck_count, spend in rows
        ],
        total=total, page=page, page_size=page_size,
    )


class UserPatch(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None
    is_billing_exempt: Optional[bool] = None


@router.patch("/users/{user_id}", response_model=UserRow)
async def update_user(
    user_id: str,
    payload: UserPatch,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserRow:
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")

    changes: dict[str, Any] = {}
    if payload.role is not None and payload.role != target.role:
        if payload.role not in {"free", "pro", "enterprise", "admin"}:
            raise HTTPException(status_code=400, detail="Unknown role")
        changes["role"] = {"from": target.role, "to": payload.role}
        target.role = payload.role
    if payload.is_active is not None and payload.is_active != target.is_active:
        changes["is_active"] = {"from": target.is_active, "to": payload.is_active}
        target.is_active = payload.is_active
    if payload.is_billing_exempt is not None and payload.is_billing_exempt != target.is_billing_exempt:
        changes["is_billing_exempt"] = {"from": target.is_billing_exempt, "to": payload.is_billing_exempt}
        target.is_billing_exempt = payload.is_billing_exempt

    await db.flush()

    if changes:
        await log_event(
            db, "admin_action", user=target,
            summary=f"{current_user.email} updated {target.email} ({', '.join(changes)})",
            meta={"admin_id": current_user.id, "admin_email": current_user.email, "changes": changes},
        )
    await db.commit()

    deck_count = (
        await db.execute(
            select(func.count(Project.id)).where(Project.user_id == target.id, Project.is_deleted.is_(False))
        )
    ).scalar_one()
    spend = (
        await db.execute(select(func.coalesce(func.sum(Payment.amount_inr), 0)).where(Payment.user_id == target.id))
    ).scalar_one()

    return UserRow(
        id=target.id, email=target.email, name=target.name, role=target.role,
        is_active=target.is_active, is_verified=target.is_verified,
        is_billing_exempt=target.is_billing_exempt,
        created_at=target.created_at.isoformat(),
        deck_count=deck_count, total_spend_inr=int(spend),
    )


# ── Transactions (who bought what, when) ────────────────────────────────────

class TransactionRow(BaseModel):
    payment_id: str
    paid_at: str
    user_id: str
    user_email: str
    user_name: str
    deck_type: str
    deck_label: str
    amount_inr: int
    razorpay_payment_id: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    project_status: Optional[str] = None
    deck_generated: bool = False
    latest_deck_url: Optional[str] = None


class TransactionListResponse(BaseModel):
    data: list[TransactionRow]
    total: int
    page: int
    page_size: int


@router.get("/transactions", response_model=TransactionListResponse)
async def list_transactions(
    user_id: Optional[str] = Query(None),
    deck_type: Optional[str] = Query(None),
    from_: Optional[datetime] = Query(None, alias="from"),
    to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> TransactionListResponse:
    latest_pres_url = (
        select(Presentation.file_url)
        .where(Presentation.project_id == Project.id)
        .order_by(Presentation.created_at.desc())
        .limit(1)
        .correlate(Project)
        .scalar_subquery()
    )

    base = (
        select(Payment, User, DeckCredit, Project, latest_pres_url)
        .join(User, User.id == Payment.user_id)
        .outerjoin(DeckCredit, DeckCredit.id == Payment.deck_credit_id)
        .outerjoin(Project, Project.id == DeckCredit.project_id)
    )
    if user_id:
        base = base.where(Payment.user_id == user_id)
    if deck_type:
        base = base.where(Payment.deck_type == deck_type)
    if from_:
        base = base.where(Payment.created_at >= from_)
    if to:
        base = base.where(Payment.created_at <= to)

    total = (await db.execute(select(func.count()).select_from(base.with_only_columns(Payment.id).subquery()))).scalar_one()

    base = base.order_by(Payment.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(base)).all()

    return TransactionListResponse(
        data=[
            TransactionRow(
                payment_id=payment.id,
                paid_at=payment.created_at.isoformat(),
                user_id=user.id, user_email=user.email, user_name=user.name,
                deck_type=payment.deck_type, deck_label=_deck_label(payment.deck_type),
                amount_inr=payment.amount_inr,
                razorpay_payment_id=payment.razorpay_payment_id,
                project_id=project.id if project else None,
                project_name=project.name if project else None,
                project_status=project.status if project else None,
                deck_generated=bool(project and project.status == "ready"),
                latest_deck_url=pres_url,
            )
            for payment, user, credit, project, pres_url in rows
        ],
        total=total, page=page, page_size=page_size,
    )


# ── Projects / decks oversight ──────────────────────────────────────────────

class AdminProjectRow(BaseModel):
    id: str
    name: str
    deck_type: str
    status: str
    user_id: str
    user_email: str
    latest_job_status: Optional[str] = None
    created_at: str
    is_deleted: bool


class AdminProjectListResponse(BaseModel):
    data: list[AdminProjectRow]
    total: int
    page: int
    page_size: int


@router.get("/projects", response_model=AdminProjectListResponse)
async def list_all_projects(
    user_id: Optional[str] = Query(None),
    deck_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    show_deleted: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminProjectListResponse:
    latest_job_status = (
        select(Job.status)
        .where(Job.project_id == Project.id)
        .order_by(Job.created_at.desc())
        .limit(1)
        .correlate(Project)
        .scalar_subquery()
    )

    base = select(Project, User.email, latest_job_status).join(User, User.id == Project.user_id)
    if not show_deleted:
        base = base.where(Project.is_deleted.is_(False))
    if user_id:
        base = base.where(Project.user_id == user_id)
    if deck_type:
        base = base.where(Project.deck_type == deck_type)
    if status:
        base = base.where(Project.status == status)

    total = (await db.execute(select(func.count()).select_from(base.with_only_columns(Project.id).subquery()))).scalar_one()

    base = base.order_by(Project.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(base)).all()

    return AdminProjectListResponse(
        data=[
            AdminProjectRow(
                id=project.id, name=project.name, deck_type=project.deck_type, status=project.status,
                user_id=project.user_id, user_email=email, latest_job_status=job_status,
                created_at=project.created_at.isoformat(), is_deleted=project.is_deleted,
            )
            for project, email, job_status in rows
        ],
        total=total, page=page, page_size=page_size,
    )


@router.post("/projects/{project_id}/soft-delete", response_model=AdminProjectRow)
async def soft_delete_project(
    project_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminProjectRow:
    project = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    project.is_deleted = True
    project.deleted_at = datetime.now(timezone.utc)
    await db.flush()

    owner = (await db.execute(select(User).where(User.id == project.user_id))).scalar_one_or_none()
    await log_event(
        db, "admin_action", user=owner,
        summary=f"{current_user.email} deleted deck \"{project.name}\" belonging to {owner.email if owner else project.user_id}",
        meta={"admin_id": current_user.id, "admin_email": current_user.email, "project_id": project.id},
    )
    await db.commit()

    return AdminProjectRow(
        id=project.id, name=project.name, deck_type=project.deck_type, status=project.status,
        user_id=project.user_id, user_email=owner.email if owner else "", latest_job_status=None,
        created_at=project.created_at.isoformat(), is_deleted=project.is_deleted,
    )


# ── Settings ─────────────────────────────────────────────────────────────────

class SettingsResponse(BaseModel):
    maintenance_mode: bool
    signups_enabled: bool
    deck_type_overrides: Optional[dict[str, bool]] = None


@router.get("/settings", response_model=SettingsResponse)
async def get_settings(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> SettingsResponse:
    values = {key: await get_setting(db, key, default) for key, default in _SETTING_DEFAULTS.items()}
    return SettingsResponse(**values)


class SettingUpdate(BaseModel):
    value: Any


@router.put("/settings/{key}", response_model=SettingsResponse)
async def update_setting(
    key: str,
    payload: SettingUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> SettingsResponse:
    if key not in _KNOWN_SETTINGS:
        raise HTTPException(status_code=400, detail=f"Unknown setting key: {key}")

    await set_setting(db, key, payload.value, updated_by=current_user.id)
    await log_event(
        db, "admin_action", user=current_user,
        summary=f"{current_user.email} changed setting \"{key}\"",
        meta={"admin_id": current_user.id, "key": key, "value": payload.value},
    )
    await db.commit()

    values = {k: await get_setting(db, k, default) for k, default in _SETTING_DEFAULTS.items()}
    return SettingsResponse(**values)
