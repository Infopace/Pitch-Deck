"""Apply `scripts/db/init.sql` to the configured database.

There is no Alembic in this project. Schema is created by
`Base.metadata.create_all()`, which creates missing TABLES but never alters
existing ones — so every column added to an already-deployed model has to be
applied by hand. That was silent: the deployed `projects` table was missing
`profile_id`, so every project query failed at the driver and the dashboard
spun on empty skeletons with nothing useful in the logs.

`init.sql` is written to be idempotent (every statement is IF NOT EXISTS or
guarded), so running this repeatedly is safe.

    python scripts/db/migrate.py             # apply
    python scripts/db/migrate.py --check     # report drift, change nothing
"""
from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(os.path.dirname(os.path.dirname(HERE)), "ipreneur", "backend")
if not os.path.isdir(BACKEND):                     # running from inside ipreneur/
    BACKEND = os.path.join(os.path.dirname(os.path.dirname(HERE)), "backend")
sys.path.insert(0, BACKEND)

INIT_SQL = os.path.join(HERE, "init.sql")


def statements(sql: str) -> list[str]:
    """Split on semicolons, but keep `DO $$ ... $$;` blocks whole."""
    out, buf, in_dollar = [], [], False
    for line in sql.splitlines():
        if line.strip().startswith("--") and not buf:
            continue
        if "$$" in line:
            in_dollar = not in_dollar if line.count("$$") % 2 else in_dollar
        buf.append(line)
        if not in_dollar and line.rstrip().endswith(";"):
            stmt = "\n".join(buf).strip()
            if re.search(r"[A-Za-z]", stmt):
                out.append(stmt.rstrip(";"))
            buf = []
    tail = "\n".join(buf).strip()
    if re.search(r"[A-Za-z]", tail):
        out.append(tail.rstrip(";"))
    return out


def _drift_line(drift) -> str:
    """None means the check could not run — never report that as a clean schema."""
    if drift is None:
        return "drift: UNKNOWN - could not reach the database (nothing was verified)"
    if not drift:
        return "drift: none - database matches the models"
    return "drift: " + ", ".join(drift)


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                    help="report model/database drift without changing anything")
    args = ap.parse_args()

    from sqlalchemy import text

    from app.db.session import check_schema_drift, engine
    import app.models.models  # noqa: F401  — register metadata

    if args.check:
        drift = await check_schema_drift()
        print(_drift_line(drift))
        await engine.dispose()
        return 0 if drift == [] else 1

    with open(INIT_SQL, encoding="utf-8-sig") as fh:
        sql = fh.read()

    applied = 0
    for stmt in statements(sql):
        label = " ".join(stmt.split())[:76].encode("ascii", "replace").decode()
        try:
            async with engine.begin() as conn:
                await conn.execute(text(stmt))
            applied += 1
            print(f"  ok   {label}")
        except Exception as exc:
            # One failing statement must not abort the rest; report and move on.
            print(f"  FAIL {label}\n       {type(exc).__name__}: {exc}")

    drift = await check_schema_drift()
    print(f"\napplied {applied} statement(s)")
    print(_drift_line(drift))
    await engine.dispose()
    return 0 if drift == [] else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
