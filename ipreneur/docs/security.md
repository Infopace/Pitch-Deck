# Security

## Auth model

- Stateless JWT (HS256), signed with a single shared `JWT_SECRET_KEY`.
- Access token lifetime: `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` = 60×24×6 = **6 days**. There is **no refresh-token flow** — `JWT_REFRESH_TOKEN_EXPIRE_DAYS` is declared in config but never read anywhere. The token issued at login/register/OTP-verify/Google-sign-in is the entire session; when it expires the user must log in again.
- `POST /auth/logout` is a no-op — there is no server-side session/token-blacklist table, so logout cannot actually revoke a token early.
- `get_current_user()` (`app/api/deps/auth.py`) decodes the bearer token, reads the `sub` claim as the user id, loads the user, and requires `is_active=True`. 401 on any failure.
- Every `/projects`, `/decks`, `/presentations`, `/profiles`, `/billing/credits*` route is scoped to the authenticated caller server-side — no cross-user access path was found in these routers.
- Projects use soft deletes (`is_deleted`), so accidental deletion is recoverable.
- Production boot refuses to start if secrets are empty/placeholder, `JWT_SECRET_KEY` is under 32 characters, debug mode is on, or any CORS origin still contains `localhost`.

## Payment verification

Razorpay payments are verified two independent ways: an HMAC signature check on the client-side checkout callback, and a second, independent HMAC check on the server-to-server webhook using a *different* secret — so a forged client-side call alone cannot mark a credit paid, and a closed browser tab doesn't strand a real payment unconfirmed. See [billing.md](billing.md).

## Two items that need action now

These were found while researching the system for this documentation, not invented for it — they're real, present-tense issues in the repository.

### 1. Real secrets committed in plaintext

`ipreneur/backend/env.cloudrun.yaml` contains live-looking values (not placeholders) for: the Supabase database password, both Gemini API keys, the JWT signing secret, the app secret key, and the S3 access/secret keys — committed directly to the repository rather than kept in Cloud Run's or Render's secret store (which `render.yaml` correctly uses for its own `sync: false` variables).

**Recommended action:** rotate every credential that appears in that file, then remove the file from version control (replace it with a `.gitignore`'d local template, or move the values into Cloud Run environment variables / Secret Manager set outside of git). `PROJECT_LOG.md` also records a separate, earlier incident of real credentials being committed to `.env.example` and later scrubbed — worth confirming those were rotated too, and that `backend/.env` / `backend/.env.render-export` (both present locally, not read as part of this work) are `.gitignore`d.

### 2. An unauthenticated endpoint makes real, billable AI calls

`POST /api/v1/pipeline/generate` has no `Depends(get_current_user)`, no rate limiting, and is not wired to project creation — it runs the crawler and the legacy research/analysis Gemini agents and returns the result directly to whoever calls it. Anyone who finds this URL can trigger real Gemini API usage against your keys with no authentication and no limit.

**Recommended action:** either add the same auth + rate-limiting the `/projects` routes already have, or remove the endpoint if it's a leftover debug/preview surface the product doesn't need. (It appears disconnected from the live generation flow entirely — see [ai-pipeline.md](ai-pipeline.md) — so removal is the simpler option unless something still depends on it.)

## Lower-priority observations

- `app_debug`/production guard logic is solid, but confirm `SENTRY_DSN` and `LOG_LEVEL` are set appropriately per environment — loguru is explicitly configured with `diagnose=False` to avoid leaking local variables (which can include secrets) into logged tracebacks; keep that setting if logging config is ever touched.
- `app/core/free_accounts.py` hardcodes a single exempt email for billing. This is documented as intentionally a one-off; if it grows, replace it with a real role/plan check rather than extending the hardcoded list.
- `Presentation.user_id` is a bare FK column with no ORM relationship wired to it on either side — not a security issue by itself, but worth knowing if an access check is ever written against `Presentation` directly instead of through its `Project`.
