import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
import bcrypt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from pydantic import BaseModel, EmailStr, ConfigDict
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.email import send_email
from app.core.ratelimit import limiter, AUTH_LIMIT, OTP_RESEND_LIMIT
from app.db.session import get_db
from app.models.models import EmailOtp, User

router = APIRouter()

#: Reused across verify_oauth2_token calls — it does its own HTTP caching of
#: Google's public signing keys, so one instance avoids refetching them.
_google_request = google_requests.Request()

_OTP_TTL_MINUTES = 10
_OTP_MAX_ATTEMPTS = 5
#: Floor between two codes for the same account, enforced regardless of
#: which endpoint asked for one — register, a login retry, and an explicit
#: resend all funnel through the same check.
_OTP_RESEND_COOLDOWN_SECONDS = 45


def _hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    is_verified: bool
    avatar_url: str | None = None


def _create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _as_utc(dt: datetime) -> datetime:
    """SQLite (used by tests) hands back naive datetimes even for a
    `DateTime(timezone=True)` column; Postgres doesn't. Everything this
    module stores is UTC, so a naive value just gets that tzinfo attached
    rather than failing the subtraction below."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


async def _maybe_issue_otp(db: AsyncSession, user: User) -> bool:
    """Creates and emails a fresh OTP, unless one already went out within
    the cooldown — so a register, a login retry, and an explicit resend
    can't stack up into a flood to the same inbox.

    Returns whether a new code was actually sent.
    """
    last_sent = (
        await db.execute(
            select(EmailOtp.created_at)
            .where(EmailOtp.user_id == user.id)
            .order_by(EmailOtp.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if last_sent is not None and (datetime.now(timezone.utc) - _as_utc(last_sent)).total_seconds() < _OTP_RESEND_COOLDOWN_SECONDS:
        return False

    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(
        EmailOtp(
            user_id=user.id,
            code_hash=_hash_password(code),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=_OTP_TTL_MINUTES),
        )
    )
    await db.flush()
    await send_email(
        user.email,
        "Your Mint verification code",
        f"<p>Your verification code is <strong>{code}</strong>.</p>"
        f"<p>It expires in {_OTP_TTL_MINUTES} minutes. If you didn't request this, ignore this email.</p>",
    )
    return True


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit(AUTH_LIMIT)
async def register(request: Request, response: Response, payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(User).where(User.email == payload.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # Insert new user — is_verified defaults to False; a password account
    # only flips it once /verify-otp accepts a code sent to this address.
    user = User(
        email=payload.email,
        name=payload.name,
        hashed_password=_hash_password(payload.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    await _maybe_issue_otp(db, user)

    return {"success": True, "data": {"email": user.email, "verification_required": True}}


@router.post("/login")
@limiter.limit(AUTH_LIMIT)
async def login(request: Request, response: Response, payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not _verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_verified:
        await _maybe_issue_otp(db, user)
        # Same reason as the attempts-counter commit below: get_db rolls
        # back on the exception this is about to raise, which would
        # silently discard the OTP row _maybe_issue_otp just created —
        # the email goes out, but the code it contains was never saved.
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "email_not_verified", "email": user.email},
        )

    user_dict = UserOut.model_validate(user).model_dump()
    return {"success": True, "data": {"user": user_dict, "access_token": _create_access_token(user.id)}}


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    code: str


class ResendOtpRequest(BaseModel):
    email: EmailStr


@router.post("/verify-otp")
@limiter.limit(AUTH_LIMIT)
async def verify_otp(request: Request, response: Response, payload: VerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect code.")

    if user.is_verified:
        # Never issue a token here without checking a code — this is the
        # one path to an access_token that only needs an email address, so
        # skipping the check would mean anyone who knows a verified user's
        # email can sign in as them. Direct them to /login instead, which
        # actually requires the password.
        raise HTTPException(status_code=400, detail="This account is already verified — sign in instead.")

    otp = (
        await db.execute(
            select(EmailOtp)
            .where(EmailOtp.user_id == user.id)
            .where(EmailOtp.consumed.is_(False))
            .order_by(EmailOtp.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if otp is None:
        raise HTTPException(status_code=400, detail="No pending code for this email — request a new one.")
    if _as_utc(otp.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This code has expired — request a new one.")
    if otp.attempts >= _OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=400, detail="Too many incorrect attempts — request a new one.")

    if not _verify_password(payload.code, otp.code_hash):
        otp.attempts += 1
        # get_db rolls back on any exception out of this endpoint, which is
        # every wrong-code path — so the increment has to commit itself
        # here, or the attempt cap above never actually accumulates and a
        # code can be brute-forced without limit.
        await db.commit()
        raise HTTPException(status_code=401, detail="Incorrect code.")

    otp.consumed = True
    user.is_verified = True

    user_dict = UserOut.model_validate(user).model_dump()
    return {"success": True, "data": {"user": user_dict, "access_token": _create_access_token(user.id)}}


@router.post("/resend-otp")
@limiter.limit(OTP_RESEND_LIMIT)
async def resend_otp(request: Request, response: Response, payload: ResendOtpRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    # Same response whether or not the email exists, or is already verified
    # — otherwise this endpoint becomes a way to probe which emails are
    # registered.
    if user is None or user.is_verified:
        return {"success": True}

    sent = await _maybe_issue_otp(db, user)
    if not sent:
        raise HTTPException(
            status_code=429,
            detail="A code was just sent — wait a bit before requesting another.",
        )
    return {"success": True}


class GoogleLoginRequest(BaseModel):
    #: The ID token (JWT) Google Identity Services' button returns as
    #: `credentialResponse.credential` — not an access token, not a code.
    credential: str


@router.post("/google")
@limiter.limit(AUTH_LIMIT)
async def login_with_google(
    request: Request, response: Response, payload: GoogleLoginRequest, db: AsyncSession = Depends(get_db)
):
    """Sign in (or sign up) with a Google ID token.

    Verifies the token's signature, audience and expiry against Google's own
    keys — nothing here trusts the browser. A first-time email becomes a new
    account with an unusable random password hash (there's no `users` column
    for "no password", and this database has no migration tooling to add
    one safely), so the account is Google-only until a real password reset
    flow exists. A returning email just signs in, whichever way it was
    originally created.
    """
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured yet.")

    try:
        idinfo = google_id_token.verify_oauth2_token(
            payload.credential, _google_request, settings.google_client_id
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google sign-in.")

    if not idinfo.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google account email is not verified.")
    email = idinfo["email"]

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            email=email,
            name=idinfo.get("name") or email.split("@")[0],
            # Random and discarded — this account only ever signs in via
            # Google, but the column is NOT NULL and there's no migration
            # path to make it optional without hand-altering production.
            hashed_password=_hash_password(secrets.token_urlsafe(32)),
            avatar_url=idinfo.get("picture"),
            is_verified=True,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

    user_dict = UserOut.model_validate(user).model_dump()
    return {"success": True, "data": {"user": user_dict, "access_token": _create_access_token(user.id)}}


@router.post("/logout")
async def logout():
    return {"success": True}


@router.get("/me")
async def get_me(
    db: AsyncSession = Depends(get_db),
):
    """Get current user from token — uses auth dependency."""
    # This is a placeholder — the actual /users/me endpoint handles this
    return {"message": "Use /api/v1/users/me instead"}
