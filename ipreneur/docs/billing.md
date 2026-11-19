# Billing

**Provider: Razorpay.** Not Stripe — `User.stripe_customer_id` and `Subscription.stripe_subscription_id` are legacy columns from an earlier design and are effectively unused today.

**Model: per-deck-type, one-time purchase.** Not a subscription. `Subscription` as a table still exists (1:1 with `User` via a unique FK) but the live flow is built on a separate `DeckCredit` model instead: "prices are in whole rupees... replaces the old monthly Pro plan" (`app/decks/pricing.py` docstring).

## Pricing

`app/decks/pricing.py: DECK_PRICES_INR` — flat INR price per deck type, tiered:

| Price (INR) | Deck types |
|---|---|
| ₹699 | investor, gtm, business, partnership, master |
| ₹599 | general, vision |
| ₹499 | sales, product, demoday |
| ₹399 | update, internal, elevator |
| not sold standalone | appendix |

`GET /billing/pricing` returns this list (excluding the hidden deck types) with no auth required, for display before signup/payment.

## Purchase flow

```
1. POST /billing/credits/order {deck_type}
     Opens a Razorpay order for amount_inr * 100 paise.
     Creates DeckCredit(status="created").
     │
     ▼
2. Client-side Razorpay checkout modal (frontend: services/razorpay.ts)
     │
     ├─► 2a. POST /billing/credits/verify {order_id, payment_id, signature}
     │        Backend recomputes hmac_sha256(f"{order_id}|{payment_id}",
     │        key_secret) and compares with hmac.compare_digest.
     │        On match: DeckCredit.status = "paid".
     │
     └─► 2b. (independent backstop) POST /webhooks/razorpay
              Verifies X-Razorpay-Signature over the raw request body with
              a SEPARATE webhook secret. On payment.captured/order.paid,
              also flips the matching credit to "paid". Covers the case
              where the browser tab closes before 2a's call fires.
     │
     ▼
3. consume_credit() — called from POST /projects or POST /projects/{id}/analyze
     Spends the OLDEST unconsumed paid credit of the matching deck_type,
     sets status="consumed", stamps project_id onto it.
     A paid-but-unused credit carries forward to whichever project of that
     type needs it next; a failed/retried generation doesn't require a
     second payment (project_already_paid() checks this).
```

Both ends of the Razorpay integration — the checkout API keys and the webhook secret — gate behind an HTTP 503 if unset, so the whole payment system is cleanly disableable in development without special-casing call sites.

## Exemption

`app/core/free_accounts.py` hardcodes one email (`puneeth@gmail.com`) that never needs a credit to generate a deck. The code explicitly documents this as a one-off, not a general mechanism — do not extend this pattern; add a proper plan/role check if more exemptions are needed.

## Monitoring who paid for what

### `payments` — the direct answer to "did they pay"

A real table (`backend/app/models/models.py: Payment`, `payments` in the DB), written exactly once per confirmed payment — never updated or deleted afterward. A row existing here always means a real, successful payment; there is no status field to misinterpret.

**Why this exists**: `deck_credits.status` moves `created → paid → consumed` as a credit is bought and then spent on a project. Once consumed, nothing in that row says "paid" anymore. The first customer to actually pay (`infantraj.a@licet.ac.in`, 2026-11-12) looked unpaid for exactly this reason — his credit was `consumed`, his deck was generated and delivered successfully, but a glance at `deck_credits` (or a filter for `status = 'paid'`) made it look like nothing had happened.

Query it directly — every row is a real payment, nothing to filter out:

```sql
SELECT u.email, p.deck_type, p.amount_inr, p.razorpay_payment_id, p.created_at
FROM payments p
JOIN users u ON u.id = p.user_id
ORDER BY p.created_at DESC;
```

It's written from both confirmation paths (the client-side verify callback and the Razorpay webhook — whichever fires first; a unique constraint on `razorpay_payment_id` makes the second write a safe no-op), and was backfilled once from every pre-existing paid `deck_credits` row, so payments made before this table existed are in there too.

### `deck_payment_overview` — the fuller picture

A view (defined in `scripts/db/init.sql`) that joins `deck_credits` with the buyer's user record, the project the credit was spent on, and that project's latest generated file — so you can see who paid, for which deck type, whether they've actually generated it, and a download link, in one query. Use `payments` for "has this person ever paid" (unambiguous); use this view when you also want to see the project/deck outcome. It's a view, not a table: it adds no new data and can never drift out of sync, because it's just a saved query over tables that already exist.

**To create it** (one-time, run in the Supabase SQL Editor for your project, or via `python scripts/db/migrate.py` from `backend/` if your local `.env` points at the right database):

```sql
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
```

**To check it**, in the Supabase Table Editor, open `deck_payment_overview` like any table — or in the SQL Editor:

```sql
-- Everyone who has actually paid (ignore abandoned/unpaid checkout attempts)
SELECT user_email, deck_type, amount_inr, payment_status, project_name,
       deck_generated, latest_deck_url, credit_created_at
FROM deck_payment_overview
WHERE payment_status IN ('paid', 'consumed')
ORDER BY credit_created_at DESC;
```

```sql
-- People who paid but haven't generated anything yet (project_id is null
-- until a project actually spends the credit)
SELECT user_email, deck_type, amount_inr, credit_created_at
FROM deck_payment_overview
WHERE payment_status = 'paid' AND project_id IS NULL;
```

Rerunning the `CREATE OR REPLACE VIEW` statement any time it changes is always safe — it never touches data, only the saved query.

## Frontend

`BillingPage` lists pricing and the user's `DeckCredit` history via `billingApi.getPricing()`/`listCredits()`. Deliberately, "Create this deck" on this page routes to the project generator rather than checking out directly — payment happens at generation time (`POST /projects` returns 402 if unpaid, which `useDeckPayment` catches and resolves by opening checkout, then retrying).
