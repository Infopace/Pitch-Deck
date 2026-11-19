# Data Model

Source of truth: `backend/app/models/models.py`. Base: `app.db.session.Base` (SQLAlchemy `DeclarativeBase`). All primary keys are app-generated **UUID strings** (`String(36)`), not native DB UUID columns.

A custom `JSONType` (`TypeDecorator` over `Text`) backs every JSON column. Its docstring claims "JSONB on Postgres, TEXT on SQLite," but the implementation stores **TEXT on both backends** — it is not switched to native JSONB. No column anywhere uses a native DB enum; string columns like `role`, `status`, `deck_type` are validated only at the application/Pydantic layer.

## Tables

### `users`
| column | type | notes |
|---|---|---|
| id | String(36) | PK |
| email | String(255) | unique, indexed |
| name | String(255) | |
| hashed_password | String(255) | bcrypt |
| avatar_url | String(512) | nullable |
| role | String(20) | default `"free"` |
| is_active | Boolean | default True |
| is_verified | Boolean | default False |
| stripe_customer_id | String(255) | unique, nullable — **legacy, unused** (billing moved to Razorpay) |
| created_at / updated_at | DateTime(tz) | server defaults |

Relationships: `projects` (1:N), `subscriptions` (declared as 1:N collection, but `Subscription.user_id` is unique — see below). One-directional targets: `CompanyProfile`, `DeckCredit`, `EmailOtp`.

### `company_profiles`
A reusable, named parameter bundle per company, shared across that user's decks. See [company-profiles.md](company-profiles.md) for the full catalogue system (924 parameters, 49 groups, per-deck-type relevance, provenance tracking) that gives meaning to the `values` blob below — this table itself is intentionally dumb storage.
| column | type | notes |
|---|---|---|
| id | String(36) | PK |
| user_id | String(36) | FK → users.id, CASCADE, indexed |
| name | String(255) | |
| values | JSONType | the ~900-parameter sparse blob (`app.profile.parameters`) |
| created_at / updated_at | DateTime(tz) | |

Relationships: `user` (one-directional), `projects` (1:N via `Project.profile_id`).

### `projects`
| column | type | notes |
|---|---|---|
| id | String(36) | PK |
| user_id | String(36) | FK → users.id, CASCADE, indexed |
| name | String(255) | |
| company_url | String(512) | nullable |
| status | String(20) | default `"draft"` |
| branding_data / research_data / deck_content | JSONType | nullable |
| error_message | Text | nullable |
| deck_type | String(32) | default `"investor"`, validated against `app.decks.registry.DECK_TYPES` in app code (not a DB constraint) |
| profile_id | String(36) | FK → company_profiles.id, **SET NULL** on delete, nullable, indexed |
| template_key | String(32) | nullable (null = default theme) |
| assets | JSONType | `{logo_url, gallery_images: [...]}` |
| is_deleted | Boolean | soft delete |
| deleted_at | DateTime(tz) | nullable |
| created_at / updated_at | DateTime(tz) | |

Relationships: `user` (N:1), `presentations` (1:N), `jobs` (1:N), `profile` (N:1, nullable). One-directional target of `DeckCredit.project`.

### `presentations`
| column | type | notes |
|---|---|---|
| id | String(36) | PK |
| project_id | String(36) | FK → projects.id, CASCADE — **not indexed** |
| user_id | String(36) | FK → users.id, CASCADE — **not indexed, and no ORM relationship declared on either side** despite the FK existing |
| file_url / thumbnail_url | String(1024) | nullable |
| file_size_bytes | Integer | nullable |
| status | String(20) | default `"pending"` |
| format | String(10) | default `"pptx"` |
| slide_count | Integer | default 0 |
| theme_id | String(64) | nullable |
| created_at / updated_at | DateTime(tz) | |

### `jobs`
| column | type | notes |
|---|---|---|
| id | String(36) | PK |
| project_id | String(36) | FK → projects.id, CASCADE, indexed |
| celery_task_id | String(255) | unique, nullable — vestigial; the live pipeline doesn't use Celery |
| status | String(20) | default `"queued"` |
| current_step | String(64) | nullable — one of `crawling/generating/rendering/uploading` in the live path |
| step_progress / total_progress | Integer | default 0 |
| message | String(512) | nullable |
| error | Text | nullable |
| result | JSONType | nullable |
| started_at / completed_at | DateTime(tz) | nullable |
| created_at | DateTime(tz) | **no `updated_at` on this table** |

### `subscriptions` — legacy, mostly superseded by `deck_credits`
| column | type | notes |
|---|---|---|
| id | String(36) | PK |
| user_id | String(36) | FK → users.id, CASCADE, **unique=True** (enforces 1:1 at the DB level, even though the ORM types it as a `list[Subscription]` collection on both sides) |
| stripe_subscription_id | String(255) | unique, nullable — unused |
| razorpay_subscription_id | String(255) | unique, nullable |
| plan | String(20) | default `"free"` |
| status | String(20) | default `"active"` |
| current_period_start / current_period_end | DateTime(tz) | nullable |
| projects_used_this_month / exports_used_this_month | Integer | default 0 |
| created_at / updated_at | DateTime(tz) | |

### `deck_credits` — the real billing unit
A paid, one-time right to generate one deck of a given type. Lifecycle: `"created"` (Razorpay order opened) → `"paid"` (signature verified) → `"consumed"` (spent on a project's generation run).
| column | type | notes |
|---|---|---|
| id | String(36) | PK |
| user_id | String(36) | FK → users.id, CASCADE, indexed |
| deck_type | String(32) | indexed |
| amount_inr | Integer | |
| razorpay_order_id | String(255) | unique |
| razorpay_payment_id | String(255) | unique, nullable |
| status | String(20) | default `"created"` |
| project_id | String(36) | FK → projects.id, **SET NULL**, nullable, indexed — which project the credit was ultimately spent on |
| created_at / updated_at | DateTime(tz) | |

### `email_otps`
One-time verification code per email/password registration (Google sign-ins skip this; `is_verified=True` at creation).
| column | type | notes |
|---|---|---|
| id | String(36) | PK |
| user_id | String(36) | FK → users.id, CASCADE, indexed |
| code_hash | String(255) | bcrypt hash of the 6-digit code |
| expires_at | DateTime(tz) | |
| attempts | Integer | default 0 |
| consumed | Boolean | default False |
| created_at | DateTime(tz) | no `updated_at` |

Multiple rows can exist per user; only the most recent unconsumed, unexpired one is valid — enforced in application code, not a DB constraint.

## Relationship diagram

```
                         ┌───────────────┐
                         │     User      │
                         └───────┬───────┘
         ┌───────────┬──────────┼───────────────┬─────────────┐
         │ 1:N        │ 1:N(FK   │ 1:1 (unique    │ 1:N          │ 1:N
         ▼            │ only)    ▼ FK)            │ (FK only)    ▼ (FK only)
  ┌─────────────┐     │        ┌──────────────┐  │          ┌──────────┐
  │CompanyProfile│    │        │ Subscription │  │          │ EmailOtp │
  └──────┬───────┘    │        │  (legacy)    │  │          └──────────┘
         │ 1:N          │        └──────────────┘  │
         │(nullable,    │                          │
         │ SET NULL)    ▼                          ▼
         └──────▶ ┌───────────────────────────────────┐
                  │              Project               │
                  └───────┬─────────────┬───────┬──────┘
                          │ 1:N          │ 1:N    │ 1:N (FK only,
                          ▼              ▼        │ SET NULL)
                   ┌─────────────┐ ┌──────────┐    ▼
                   │ Presentation │ │   Job    │  ┌────────────┐
                   │ (also has a  │ └──────────┘  │ DeckCredit  │
                   │ user_id FK   │               │ (also FK → │
                   │ w/ no ORM    │               │  User)      │
                   │ relationship)│               └────────────┘
                   └─────────────┘
```

### `payments` — append-only ledger of confirmed payments
| column | type | notes |
|---|---|---|
| id | String(36) | PK |
| user_id | String(36) | FK → users.id, CASCADE, indexed |
| deck_credit_id | String(36) | FK → deck_credits.id, SET NULL, nullable, indexed — traceability back to the order/consumption lifecycle |
| deck_type | String(32) | indexed |
| amount_inr | Integer | |
| razorpay_order_id | String(255) | |
| razorpay_payment_id | String(255) | **unique** — guarantees one real payment produces exactly one row even though both the client-side verify call and the Razorpay webhook race to write it |
| created_at | DateTime(tz) | when the payment was confirmed — **never updated after insert** |

Added because `deck_credits.status` moves `created → paid → consumed`, so once a credit is spent on a project, nothing in `deck_credits` says "paid" anymore — querying for `status = 'paid'` silently excludes every customer who already received their deck. `payments` has no status field and nothing ever updates a row after it's written: its mere existence is the fact. Written from `app/api/v1/endpoints/billing.py: _record_payment()`, called from both `POST /billing/credits/verify` and `POST /webhooks/razorpay` — whichever fires first; the unique constraint on `razorpay_payment_id` makes the second call's write a no-op via a savepoint, so it can never corrupt or fail the credit-status update it travels alongside. `scripts/db/init.sql` also backfills it once from every pre-existing `deck_credits` row that already has a `razorpay_payment_id`, so payments made before this table existed are captured too.

## `deck_payment_overview` view

A read-only view (added in `scripts/db/init.sql`) that joins `deck_credits` with `users`, `projects`, and the latest `presentations` row per project, so "who paid, for what deck type, and did they end up with a finished deck" is one query instead of four. Useful for the fuller picture (did the paid deck actually render); for the simpler question "has this person ever paid," query `payments` instead — it can't be misread the way a `deck_credits.status` filter can. See [billing.md](billing.md) for how to query both.

## How the schema is actually applied — there is no Alembic

`alembic` is only a pip dependency; there is no `alembic/` directory or `env.py` anywhere in the repo. Instead:

1. **`Base.metadata.create_all()`**, run at startup in `app/db/session.py: init_db()`. Idempotent for *new* tables, but — as the code itself comments twice — it **never alters an existing table**.
2. **SQLite-only hand ALTERs** inside `init_db()`: after `create_all`, it inspects `PRAGMA table_info` on `projects`/`subscriptions` and adds a short hardcoded list of columns if missing. Scoped to SQLite only.
3. **`scripts/db/init.sql`** — the project's de facto migration file, mounted into the Postgres Docker container's `docker-entrypoint-initdb.d/` and otherwise run by hand against deployed databases. Every statement is `IF NOT EXISTS`/idempotent (enables `uuid-ossp`/`pg_trgm`, backfills `projects.deck_type`, creates `company_profiles`, adds `projects.profile_id` + index). It is one cumulative file, not a numbered migration history, and does **not** yet cover `deck_credits`/`email_otps` (those are new enough to rely solely on `create_all()`, which works because they're whole new tables).
4. **`scripts/db/migrate.py`** — applies `init.sql` statement-by-statement against whatever `DATABASE_URL` resolves, tolerating already-applied statements; `--check` runs drift detection only.
5. **`check_schema_drift()`** — runs on every app startup, compares declared `Base.metadata` columns against the live DB via `sqlalchemy.inspect`, and logs exactly which `table.column` is missing plus the fix command. This is the project's substitute for migration version tracking: a live drift detector rather than a historical log. (A real past incident, recorded in `scripts/db/migrate.py`'s docstring: a deployed `projects` table was missing `profile_id`, and every project query failed silently with a blank dashboard until this was caught.)

## Connection details

- `Settings.database_url` defaults to local Postgres, but the committed dev `.env` and production config both point at a **Supabase-hosted Postgres pooler** (`aws-0-ap-northeast-1.pooler.supabase.com`) via `asyncpg`.
- SQLite (`backend/ipreneur.db`) is a **dormant fallback** — it only activates if the `asyncpg` package fails to import. It is not the normal dev or prod path today; the file on disk is a leftover from a time that fallback was exercised.
- Connection pool is hardcoded to `pool_size=5, max_overflow=2` in `app/db/session.py` (comment: stay under Supabase PgBouncer's session-mode cap of 15) — `Settings.database_pool_size`/`database_max_overflow` (defaults 10/20) are declared but never actually read, so they're dead config.
- A second, `NullPool`-based engine path exists specifically for Celery/background-thread code that spins up its own event loop, so it never shares uvicorn's pooled asyncpg connections across event loops (a documented failure mode otherwise).
