# Environment Variables

Source: `backend/app/core/config.py` (pydantic-settings `BaseSettings`) and `backend/.env.example`. No values are reproduced here — see that file for the template to copy into `backend/.env` for local development.

| Category | Variables | Purpose |
|---|---|---|
| Application | `APP_NAME` (defaults to `"Mint"`, not `"iPreneur"`), `APP_ENV` (development\|staging\|production), `APP_SECRET_KEY`, `APP_DEBUG`, `APP_PORT` | Core app identity/mode. |
| Database | `DATABASE_URL`, `DATABASE_POOL_SIZE`, `DATABASE_MAX_OVERFLOW` | Postgres connection (asyncpg). Pool size/overflow settings are **declared but never read** — the real pool is hardcoded to 5/2 in `app/db/session.py` to stay under Supabase's PgBouncer session-mode cap. |
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Present in config but not consumed anywhere found outside `config.py` itself — production reaches Supabase via `DATABASE_URL` and `S3_ENDPOINT_URL` directly, not these. |
| Redis | `REDIS_URL`, `REDIS_CACHE_TTL` | Only consumed as Celery broker/result-backend defaults; no app-level caching code uses Redis directly today. |
| Auth / JWT | `JWT_SECRET_KEY`, `JWT_ALGORITHM` (HS256), `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (currently 6 days' worth of minutes), `JWT_REFRESH_TOKEN_EXPIRE_DAYS` (**unused** — there is no refresh flow), `GOOGLE_CLIENT_ID` (OAuth audience; also needed in the frontend as `VITE_GOOGLE_CLIENT_ID` — not a secret) | Session auth. |
| Email (SMTP) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_USE_SSL` | Sends the registration OTP email. Empty `SMTP_HOST` disables sending (OTP still generated, useful for local dev). |
| AI — Gemini | `GEMINI_API_KEY` (generation calls), `GEMINI_API_KEY_2` (research calls — separate key to avoid cross-rate-limiting), `GEMINI_MODEL`, `GEMINI_MODEL_RESEARCH` (falls back to `GEMINI_MODEL` if unset), `GEMINI_MAX_TOKENS`, `GEMINI_THINKING_BUDGET` | The only AI provider actually called. |
| AI — Anthropic | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_MAX_TOKENS` | Present in `.env.example` but **not used anywhere in the backend** — no Anthropic/Claude import exists in the codebase. Leftover from an earlier design. |
| AI — Groq | `GROQ_API_KEY` | Declared with a comment describing it as an automatic fallback when Gemini is unavailable, but **never read anywhere outside `config.py`** — there is no real fallback provider in the current code. |
| Storage | `S3_ENDPOINT_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_NAME`, `S3_REGION`, `CDN_BASE_URL` | Points at Supabase Storage (S3-compatible) in production, MinIO in local Docker Compose. `StorageClient` falls back to local disk if credentials look like unconfigured MinIO defaults. |
| CORS | `CORS_ORIGINS` (comma-separated exact list), `CORS_ORIGIN_REGEX` (additive regex, used for Cloudflare/Firebase-style preview-deployment subdomains) | |
| Celery | `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` | Configured (Redis) but no worker process runs in production — see [ai-pipeline.md](ai-pipeline.md). |
| Monitoring | `SENTRY_DSN` (empty disables it), `LOG_LEVEL` | Sentry traces sampled at 10%; loguru explicitly configured with `diagnose=False` to avoid leaking local variables (which can include secrets) into traceback logs. |
| Billing | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Per-deck-type pricing itself lives in code (`app/decks/pricing.py`), not env vars. Checkout/webhooks each return 503 if their respective secret is unset, so they're cleanly disableable in dev. |
| Crawler | `PLAYWRIGHT_HEADLESS`, `CRAWL_TIMEOUT_MS` (default 30000), `CRAWL_MAX_PAGES` (default 18) | |

## Production boot guard

A pydantic model validator refuses to start the app under `APP_ENV=production` if any of the following are true: a secret is empty/placeholder/`change_me`, `JWT_SECRET_KEY` is under 32 characters, `APP_DEBUG=True`, `GEMINI_API_KEY`/`GEMINI_MODEL` is unset, or any `CORS_ORIGINS` entry still contains `localhost`.

## Deployment-specific variable sets

Render's `render.yaml` splits variables into plain (committed) values like `APP_ENV`, `GEMINI_MODEL`, `S3_REGION`, and `sync: false` values set only in the Render dashboard (`CORS_ORIGINS`, `APP_SECRET_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`, both Gemini keys, S3 credentials, `SENTRY_DSN`) — but see [deployment.md](deployment.md): this file is not what's actually running.

The file that **is** closer to what's live, `backend/env.cloudrun.yaml`, currently has a serious problem: it contains the real values for several of the secret-category variables above, committed in plaintext. See [security.md](security.md).
