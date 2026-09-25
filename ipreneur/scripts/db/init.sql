-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant privileges to application user
GRANT ALL PRIVILEGES ON DATABASE ipreneur TO ipreneur;

-- Multi-deck-type support. SQLAlchemy's create_all() cannot alter an existing
-- table, so this runs as a migration against any database created before the
-- deck-type registry landed. Existing rows are investor decks by definition.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deck_type VARCHAR(32) NOT NULL DEFAULT 'investor';


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
