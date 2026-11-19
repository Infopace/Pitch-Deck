-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant privileges to application user
GRANT ALL PRIVILEGES ON DATABASE ipreneur TO ipreneur;

-- Multi-deck-type support. SQLAlchemy's create_all() cannot alter an existing
-- table, so this runs as a migration against any database created before the
-- deck-type registry landed. Existing rows are investor decks by definition.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deck_type VARCHAR(32) NOT NULL DEFAULT 'investor';


-- Admin panel: admin-grantable billing exemption, independent of the single
-- hardcoded email in app.core.free_accounts.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_billing_exempt BOOLEAN NOT NULL DEFAULT false;

-- Pre-existing gap: this column has been on the Subscription model (and in
-- the SQLite dev migration below in session.py) for a while, but was never
-- added here for Postgres.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255);


-- ── Company profiles (master parameter set) ──────────────────────────────────
-- Base.metadata.create_all() creates new tables but never alters existing ones,
-- so the projects.profile_id column has to be added explicitly here.
CREATE TABLE IF NOT EXISTS company_profiles (
    id          VARCHAR(36) PRIMARY KEY,
    user_id     VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    "values"    JSONB DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_company_profiles_user_id ON company_profiles(user_id);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS profile_id VARCHAR(36)
    REFERENCES company_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_projects_profile_id ON projects(profile_id);


-- ── Payment monitoring view ──────────────────────────────────────────────────
-- One row per deck_credits purchase, joined with who bought it and what
-- happened to the project it was spent on. This is a VIEW, not a table: the
-- source of truth (deck_credits/users/projects/presentations) already exists,
-- so this just makes it readable in one query instead of four. It is always
-- in sync with those tables automatically — there is nothing to keep updated.
CREATE OR REPLACE VIEW deck_payment_overview AS
SELECT
    dc.id                       AS credit_id,
    dc.status                   AS payment_status,          -- created | paid | consumed
    dc.deck_type,
    dc.amount_inr,
    dc.razorpay_order_id,
    dc.razorpay_payment_id,
    dc.created_at               AS credit_created_at,
    dc.updated_at               AS payment_status_updated_at,

    u.id                        AS user_id,
    u.email                     AS user_email,
    u.name                      AS user_name,

    dc.project_id,
    p.name                      AS project_name,
    p.status                    AS project_status,          -- draft|analyzing|...|ready|error
    p.created_at                AS project_created_at,
    (p.status = 'ready')        AS deck_generated,

    pres.file_url                AS latest_deck_url,
    pres.created_at             AS latest_deck_generated_at
FROM deck_credits dc
JOIN users u ON u.id = dc.user_id
LEFT JOIN projects p ON p.id = dc.project_id
LEFT JOIN LATERAL (
    SELECT pr.file_url, pr.created_at
    FROM presentations pr
    WHERE pr.project_id = p.id
    ORDER BY pr.created_at DESC
    LIMIT 1
) pres ON TRUE
ORDER BY dc.created_at DESC;


-- ── Payments ledger (append-only — a row here always means "they paid") ────
-- deck_credits.status moves created -> paid -> consumed, so once a credit is
-- spent on a project, nothing in deck_credits says "paid" anymore — a
-- customer who paid successfully and got their deck can look, by that
-- column alone, indistinguishable from one who never paid. This table is
-- written once, at the moment Razorpay confirms a payment, and never
-- changed afterward (see app.api.v1.endpoints.billing._record_payment,
-- called from both the client-side verify endpoint and the webhook).
CREATE TABLE IF NOT EXISTS payments (
    id                   VARCHAR(36) PRIMARY KEY,
    user_id              VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deck_credit_id       VARCHAR(36) REFERENCES deck_credits(id) ON DELETE SET NULL,
    deck_type            VARCHAR(32) NOT NULL,
    amount_inr           INTEGER NOT NULL,
    razorpay_order_id    VARCHAR(255) NOT NULL,
    razorpay_payment_id  VARCHAR(255) NOT NULL UNIQUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS ix_payments_deck_type ON payments(deck_type);

-- One-time backfill: every deck_credits row that already has a
-- razorpay_payment_id was, by definition, a real confirmed payment that
-- happened before this table existed (including anything already consumed).
-- Safe to re-run: ON CONFLICT means a payment already recorded is skipped.
INSERT INTO payments (id, user_id, deck_credit_id, deck_type, amount_inr,
                       razorpay_order_id, razorpay_payment_id, created_at)
SELECT uuid_generate_v4()::text, dc.user_id, dc.id, dc.deck_type, dc.amount_inr,
       dc.razorpay_order_id, dc.razorpay_payment_id, dc.updated_at
FROM deck_credits dc
WHERE dc.razorpay_payment_id IS NOT NULL
ON CONFLICT (razorpay_payment_id) DO NOTHING;
