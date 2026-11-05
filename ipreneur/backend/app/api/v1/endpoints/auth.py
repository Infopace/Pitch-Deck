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
from app.core.ratelimit import limiter, AUTH_LIMIT
from app.db.session import get_db
from app.models.models import User

router = APIRouter()

#: Reused across verify_oauth2_token calls — it does its own HTTP caching of
#: Google's public signing keys, so one instance avoids refetching them.
_google_request = google_requests.Request()


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


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit(AUTH_LIMIT)
async def register(request: Request, response: Response, payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(User).where(User.email == payload.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # Insert new user
    user = User(
        email=payload.email,
        name=payload.name,
        hashed_password=_hash_password(payload.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    user_dict = UserOut.model_validate(user).model_dump()
    return {"success": True, "data": {"user": user_dict, "access_token": _create_access_token(user.id)}}


@router.post("/login")
@limiter.limit(AUTH_LIMIT)
async def login(request: Request, response: Response, payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not _verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user_dict = UserOut.model_validate(user).model_dump()
    return {"success": True, "data": {"user": user_dict, "access_token": _create_access_token(user.id)}}


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
