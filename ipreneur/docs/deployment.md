# Deployment

The repo contains configs for **four** possible hosting setups. Only one combination is actually live. This page states which, and why the others shouldn't be assumed current.

## What's actually live

```
Backend:  Google Cloud Run
          service: pitch-deck-backend, project 868264766280, region asia-northeast1
          auto-deployed by a Cloud Build trigger watching Infopace/Pitch-Deck on push to main
Frontend: Firebase Hosting
          project: pitch-deck-e1d6c, custom domain pitchdeck.infopaceindia.com
          auto-deployed by .github/workflows/firebase-hosting-deploy.yml (GitHub Actions,
          Workload Identity Federation — no stored service-account key)
Database: Supabase-hosted Postgres, ap-northeast-1, via asyncpg + PgBouncer pooling
Storage:  Supabase Storage (S3-compatible), bucket "decks", ap-northeast-1
Workers:  none — a single Cloud Run process runs `uvicorn app.main:app` only.
          No Celery worker or beat process is deployed anywhere.
```

Evidence: `PROJECT_LOG.md`'s most recent entries (2026-10-27) describe the frontend's migration to Firebase and record it as verified working ("pushing a change deploys within ~1 minute and the Last-Modified header matches the workflow run time"); `firebase-hosting-deploy.yml` hardcodes the Cloud Run backend URL as its build-time `VITE_API_URL`; `backend/env.cloudrun.yaml` is a real (if insecurely-committed — see below) Cloud Run env manifest pointing at Supabase.

## What exists but is not driving production

| Config | What it defines | Status |
|---|---|---|
| `render.yaml` (repo root) | A Render Blueprint: one `ipreneur-api` web service, Docker runtime, `plan: free`, region singapore | **Explicitly self-documented as inactive** — its own header comment says the live API was hand-created in the Render dashboard under a different name, is not tracked by this file, and applying this Blueprint would create a second, separate service. Don't treat it as the production definition. |
| `ipreneur/docker-compose.yml` | 6 services: postgres, redis, minio, backend (`--reload`), worker (Celery), beat (Celery) | **Local development only.** Default/weak passwords, hot-reload backend, and the frontend container's `production` Dockerfile target would fail to build today — no `nginx.conf` exists anywhere in the repo despite the frontend Dockerfile's production stage trying to `COPY` one in. Only the `development` target is ever actually built by this compose file, so that specific breakage is latent, not currently hit — but there is no working self-hosted production path as committed. |
| `ipreneur/frontend/wrangler.jsonc` | Cloudflare Workers/Pages static-asset config | **Stale.** Superseded by the Firebase migration (commit history: Cloudflare Sep 30 → Vercel Oct 7 → Firebase Oct 27, confirmed live). |
| `ipreneur/frontend/vercel.json` | Vercel SPA rewrite | **Stale**, same chronology. |

`render.yaml`'s own comments also still describe the frontend as "a Cloudflare Worker" — that comment predates the later Firebase migration and is itself one of the stale artifacts.

## Backend image (`ipreneur/backend/Dockerfile`, duplicated at `ipreneur/infrastructure/docker/backend/Dockerfile`)

- Base: `python:3.11-slim`, single stage.
- Installs Chromium runtime libraries (not just `playwright install`'s own deps) because Playwright drives a full headless Chromium, not a headless-shell-only setup.
- `playwright==1.52.0` is pinned in `requirements.txt`; Chromium binaries are installed **as the non-root `appuser`** at image-build time, with `PLAYWRIGHT_BROWSERS_PATH` set so install-time and run-time paths match.
- `CMD` uses shell form (`uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`) specifically so `$PORT` expands for Render/Cloud Run's port-injection convention, falling back to 8000 locally.
- **Any dependency bump — especially Playwright — requires a cache-busting rebuild** (`docker-compose build --no-cache backend worker beat` locally, or the equivalent on whichever platform builds the image), or `BrowserType.launch` fails at runtime from a binary/package version mismatch. This has bitten the project before (`README.md`).

## CI

- **`.github/workflows/firebase-hosting-deploy.yml`** — triggers on push to `main` touching `ipreneur/frontend/**`. `npm ci && npm run build` with build-time `VITE_API_URL`/`VITE_GOOGLE_CLIENT_ID` baked in (both are public values, not secrets), then deploys via `firebase-tools` using Workload Identity Federation (no stored JSON key, per org policy against service-account key creation).
- **`.github/workflows/security.yml`** — runs `anthropics/claude-code-security-review` (pinned to an exact commit SHA, not a floating tag) on pull requests and manual dispatch. Not yet wired to run on direct pushes to `main`, which is this repo's current normal flow.

## Setup scripts

- **`scripts/setup/install.sh`** — checks for docker/node/python3, copies `.env.example` → `.env` if missing, brings up `postgres`/`redis`/`minio` via compose, installs Python deps in a venv, and calls `init_db()`. Its prompt to add an `ANTHROPIC_API_KEY` is stale — Gemini is the only provider actually used.
- **`scripts/db/init.sql` / `migrate.py`** — see [data-model.md](data-model.md) for how schema changes are actually applied (no Alembic).

## Security items that affect deployment — act on these

See [security.md](security.md) for full detail. Short version:

1. **`ipreneur/backend/env.cloudrun.yaml` contains real, plaintext secrets committed to the repo** (DB password, both Gemini keys, JWT/app secret key, S3 keys). Rotate every credential in that file and stop committing it — use Cloud Run's/Render's own secret store instead, the same way `render.yaml` already does for its `sync: false` vars.
2. `backend/.env` and `backend/.env.render-export` exist locally and likely also contain real secrets — confirm both are `.gitignore`d, and check `PROJECT_LOG.md`'s record of a prior real-credential leak into `.env.example` (since scrubbed) to confirm those were rotated too.
