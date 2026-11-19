# API Reference

Base URL: `https://<host>/api/v1`. Live production host is the Cloud Run service behind `pitchdeck.infopaceindia.com`'s backend calls (see [deployment.md](deployment.md)).

Router mounting: `app/main.py` mounts `app/api/v1/routes/__init__.py` at prefix `/api/v1`. (`app/api/v1/__init__.py` is an unused auto-generated stub — don't confuse the two.)

Auth header: `Authorization: Bearer <jwt>`. Tokens are minted by `/auth/*` and `/auth/google`, last **6 days**, and cannot be refreshed — the user must log in again after expiry (see [security.md](security.md)).

---

## `/auth` — no auth required

| Method & path | Body | Notes |
|---|---|---|
| `POST /auth/register` | `{email, name, password}` | Creates user (bcrypt hash), sends email OTP. Returns `{verification_required: true}` — account unusable until verified. Rate-limited 10/min. |
| `POST /auth/login` | `{email, password}` | 403 `email_not_verified` (re-sends OTP) if unverified. Returns `{user, access_token}`. Rate-limited 10/min. |
| `POST /auth/verify-otp` | `{email, code}` | Bcrypt-hashed OTP, 10-min TTL, max 5 attempts. Marks verified, returns `{user, access_token}`. |
| `POST /auth/resend-otp` | `{email}` | Shared 45s cooldown across register/login/resend. Rate-limited 5/min. |
| `POST /auth/google` | `{credential}` | Google Identity Services ID token (not an OAuth code) — verified against `GOOGLE_CLIENT_ID`. First-time email auto-creates a verified account. 503 if `GOOGLE_CLIENT_ID` unset. |
| `POST /auth/logout` | — | No-op; JWT is stateless, nothing to revoke. |
| `GET /auth/me` | — | **Dead placeholder** — returns a message pointing at `/users/me`. Not the real "who am I." |

## `/users` — requires auth

| Method & path | Notes |
|---|---|
| `GET /users/me` | Returns `{id, email, name, role, is_active, is_verified}`. |

## `/projects` — requires auth on every route

| Method & path | Notes |
|---|---|
| `POST /projects` | `ProjectCreate{name, company_url?, start_analysis, branding_data?, deck_type, profile_id?}`. Validates `deck_type` and that type's required brief/manual fields are present. If `start_analysis=true` and the deck type is a paid one (and the caller isn't the one hardcoded free-account exemption), requires an already-paid `DeckCredit` — **402 `payment_required`** otherwise. Consumes the credit, creates `Job(status="queued")`, spawns the background generation thread. Rate-limited 60/hour. |
| `GET /projects` | Paginated list of the caller's non-deleted projects, filterable by `status`. |
| `GET /projects/{id}` | Single project detail. |
| `PUT /projects/{id}` | Updates `name`/`template_key`/`template_data` only — a shallow merge, never overwrites the full `deck_content.slides`. |
| `POST /projects/{id}/assets` | Multipart: one `logo` + up to 5 `gallery` images. Stored under `backend/uploads/{project_id}/` (local disk, not S3). |
| `DELETE /projects/{id}` | Soft delete (`is_deleted=True`). |
| `POST /projects/{id}/analyze` | Re-triggers generation on an existing project. Same payment gate; rejects if already in progress. Rate-limited 20/hour. |
| `GET /projects/{id}/status` | Latest `Job` as `{job_id, project_id, status, current_step, step_progress, total_progress, message, error}` — what the frontend polls every 3s. |

## `/deck-types` — no auth

| Method & path | Notes |
|---|---|
| `GET /deck-types` | Full catalogue from `app.decks.registry.serialize_deck_types()`: key, label, description, slide count, research level, supported stages, which intake fields are required/conditional/optional for that type. Drives the New-Project form dynamically — the frontend never hardcodes which fields a deck type needs. |

## `/profiles` — requires auth except `/profiles/schema`

A `CompanyProfile` is a reusable, named bundle of founder-provided parameters (~900-parameter catalogue) that can back multiple decks/projects, so a founder doesn't re-enter the same facts per deck.

| Method & path | Notes |
|---|---|
| `GET /profiles/schema?deck_type=&stage=` | No auth. The parameter catalogue filtered to what one deck type actually consumes. |
| `GET /profiles` | List the caller's profiles with per-profile completeness stats. |
| `POST /profiles` | `{name, values}`. |
| `GET /profiles/{id}?deck_type=&stage=` | Single profile, with completeness computed against the given deck type. |
| `PATCH /profiles/{id}` | Partial merge of `values` (never a full replace — two tabs editing different sections can't clobber each other) + optional rename. |
| `GET /profiles/{id}/readiness?deck_type=` | Which required parameters are still missing for a given deck type. |
| `DELETE /profiles/{id}` | — |

## `/decks` — requires auth

| Method & path | Notes |
|---|---|
| `GET /decks/{project_id}` | Returns the stored `deck_content` JSON + slide count. Read-only — does not trigger generation. |

## `/presentations` — requires auth

| Method & path | Notes |
|---|---|
| `GET /presentations/{project_id}/download?format=pptx` | Re-renders the PPTX **on demand** from the stored `deck_content` + currently-selected `template_key`, so a theme change is reflected without re-running AI generation. Falls back to the last pre-rendered file in storage if on-demand render throws. The `format` query param is accepted but currently always produces PPTX. |

## `/billing` — Razorpay, one-time credits (no subscriptions)

| Method & path | Notes |
|---|---|
| `GET /billing/pricing` | No auth. Sellable deck types + INR price. |
| `GET /billing/credits` | Auth. Caller's purchase history (`DeckCredit` rows). |
| `POST /billing/credits/order` | Auth. Opens a Razorpay order for one deck-type credit. 503 if Razorpay keys unset; 400 if that deck type isn't individually sold. |
| `POST /billing/credits/verify` | Auth. Verifies the Razorpay HMAC signature from the client-side checkout callback, flips the credit to `paid`. |

See [billing.md](billing.md) for the full purchase lifecycle.

## `/webhooks` — no auth (public), signature-verified

| Method & path | Notes |
|---|---|
| `POST /webhooks/razorpay` | Verifies `X-Razorpay-Signature` HMAC over the raw body using a webhook-specific secret (different from the API key secret). On `payment.captured`/`order.paid`, flips the matching `DeckCredit` to `paid` — backstop for a closed browser tab before the client-side verify call fires. 503 if the webhook secret is unset. |

## `/pipeline` — ⚠️ no auth dependency at all

| Method & path | Notes |
|---|---|
| `POST /pipeline/generate` | `CompanyIntake` body. Runs the crawler and the **legacy** branding/research/analysis agents, returns combined JSON. Does **not** create a `Project` or `Job`, is **not rate-limited**, and has no `Depends(get_current_user)` — reachable by anyone and makes real Gemini calls. This is not the path the product UI uses. See [security.md](security.md) for why this needs a decision (lock it down or remove it). |
