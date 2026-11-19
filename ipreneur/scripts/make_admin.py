"""Promote an existing user to the "admin" role.

There is no UI path to create the first admin account, so this is the
bootstrap: sign up normally through the app, then run this once.

    python scripts/make_admin.py someone@example.com
"""
from __future__ import annotations

import asyncio
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(os.path.dirname(HERE), "backend")
sys.path.insert(0, BACKEND)


async def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python scripts/make_admin.py <email>")
        return 1
    email = sys.argv[1]

    from sqlalchemy import select

    from app.db.session import engine, AsyncSessionFactory
    from app.models.models import User

    async with AsyncSessionFactory() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if user is None:
            print(f"no user found with email {email!r} — sign up first, then run this again")
            await engine.dispose()
            return 1
        if user.role == "admin":
            print(f"{email} is already an admin")
        else:
            user.role = "admin"
            await session.commit()
            print(f"{email} is now an admin")

    await engine.dispose()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
