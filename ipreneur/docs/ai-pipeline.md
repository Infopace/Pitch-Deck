# AI Pipeline & Deck Generation

## There are two pipelines in this codebase — only one runs

**Live path** (what `POST /projects` and `POST /projects/{id}/analyze` actually trigger): a plain Python `threading.Thread(daemon=True)`, spun up inside the FastAPI request handler, running its own `asyncio` event loop. **No Celery.** This is confirmed by the code's own comment in `app/main.py` (`_reconcile_orphaned_jobs()`): generation runs in a detached daemon thread that does not survive a process restart, and moving it onto the Celery worker is described as a future fix, not the current state.

**Legacy path**: a fully-built 7-step Celery task (`app/workers/tasks/analysis.py: run_analysis_pipeline`) using four separate agents (branding → research → analysis → content-generation, producing a fixed 14 slides). It is imported in `projects.py` but **never called**. It's reachable only through the standalone `POST /api/v1/pipeline/generate` endpoint, which has no auth dependency, creates no `Project`/`Job`, and is not what the product UI uses — see [security.md](security.md). Celery/Redis/`beat` are configured (`docker-compose.yml`, `app/workers/celery_app.py`) but no worker process runs in production — the Cloud Run container runs `uvicorn app.main:app` only.

Treat the rest of this document as describing the **live** path. The legacy agents (`app/agents/{research,content,analysis}/`) and `app/workers/` are dead code in the current product unless revived deliberately.

## Step by step

```
POST /projects {company_url?, deck_type, ...}  (or /projects/{id}/analyze)
   │
   ▼
1. WebCrawler  (skipped if no company_url — job jumps straight to 25%)
   Playwright, headless Chromium, BFS with sitemap + link-discovery seeding,
   priority-scored by path (team/leadership pages score highest, home page
   next), 4 pages in parallel, capped at CRAWL_MAX_PAGES (default 18) and
   CRAWL_TIMEOUT_MS (30s). Extracts title/description/headings/body text/
   images/CSS colors/JSON-LD/pricing signals/team mentions.
   → CrawlResult                                          [0% → 25%]
   │
   ▼
2. MasterDeckAgent.generate()  — one agent, two Gemini passes
   Pass 1 — Research (Key 2, settings.effective_research_model):
     Google Search–grounded call. Profile depth depends on the deck
     type's `research` setting: "full" (founders, funding, competitors,
     market), "light" (competitors/market only), or "none" (skipped
     entirely for types like internal/update). Falls back to a
     leadership-only search if no founders are found; retries once on
     quota errors using Key 1.
   Pass 2 — Generation (Key 1, settings.gemini_model):
     One large prompt built from the deck type's ordered sections
     (app.decks.prompt.build_generation_sections()), asking for a single
     JSON blob containing both the legacy `slides[]` array and the richer
     `template_data` object used by the newer renderer/theme system.
     Retries up to 4x on transient errors (429/503/500/overloaded); if the
     model hits MAX_TOKENS, retries once more with a leaner "compact"
     prompt.
   Post-processing:
     - `template_data` validated section-by-section against pydantic
       models (one bad section is dropped with a warning, not a failure).
     - A deterministic, advisory-only "claims auditor" pass flags (never
       blocks) issues like percentages not summing to 100, placeholder
       text, or inconsistent figures — stored in research_summary.audit.
   → GeneratedDeckContent                                  [25% → 75%]
   │
   ▼
3. PPTRenderer.render()  (python-pptx, 13.333"×7.5" widescreen)
   Resolves the selected theme, overrides its accent colors with the
   company's real brand colors when detected, dispatches each slide to
   one of 6 layout methods based on that section's layout hint, and
   builds real native charts/tables (not images) for KPI tiles, market
   sizing (TAM/SAM/SOM), use-of-funds, and competitor comparisons.
   → .pptx bytes                                            [75% → 95%]
   │
   ▼
4. StorageClient.upload_pptx()
   Supabase Storage (S3-compatible) in production; local filesystem under
   backend/storage/ if S3 credentials look like unconfigured MinIO
   defaults.                                                 [95% → 100%]
   │
   ▼
Project.branding_data / research_data / deck_content persisted;
Presentation row created; Job marked completed (or error/Project.status=
"error" with Job.error set, on any failure).
```

Step names surfaced to the frontend via `GET /projects/{id}/status.current_step`: `crawling`, `generating`, `rendering`, `uploading`.

## Model & provider facts

- **Provider**: Gemini only. `app/core/genai_client.py` is a hand-rolled `httpx` client calling the Gemini REST endpoint directly (`generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`) — not the official `google-genai` SDK, and its own doc-comment says "single provider, no fallback."
- **No Claude/Anthropic anywhere** in the backend — any document or comment claiming otherwise predates this design.
- **Dual keys, confirmed real**: `GEMINI_API_KEY` for generation, `GEMINI_API_KEY_2` for research — kept separate specifically to avoid one call's rate limit blocking the other during parallel execution.
- **Model id**: production (`backend/env.cloudrun.yaml`) sets `GEMINI_MODEL=gemini-3.8-flash` and `GEMINI_MODEL_RESEARCH=gemini-3.8-flash`. If any older doc says "Gemini 2.5 Flash," that's stale.
- **Groq is configured but dead code**: `settings.groq_api_key` exists with a comment describing it as an automatic fallback, but it's never read anywhere outside `config.py` — there is no actual fallback provider.

## Deck types & the section registry

`app/decks/registry.py` is the single source of truth a `DeckType` is built from: key, label, audience, goal, an **ordered tuple of section keys**, a research depth (`full`/`light`/`none`), optional stage overrides (e.g. the investor deck swaps in vision-stage sections instead of traction sections for idea/pre-seed companies), optional dynamic sections (only the Appendix type uses this — its slide count is computed from how much of a `CompanyProfile` is filled in, capped at 24 slides), and per-type "brief fields" (extra intake questions) and "manual required" fields (needed when there's no website to crawl).

14 deck types exist: `investor, sales, product, partnership, internal, update, vision, general, elevator, demoday, gtm, business, master, appendix`. Four of these (`vision, partnership, master, appendix`) are hidden from the New-Project picker and from the pricing list, but remain fully resolvable/renderable for decks that already reference them.

**Per-deck-type field relevance** — the mechanism behind "the New Deck form only asks for the fields that deck type actually uses": `intake_fields_for(deck_type)` maps the shared intake form's fields to a relevance code (`R`=required, `C`=conditional, `O`=optional, `N`=not shown). `GET /api/v1/deck-types` serializes this per type, and the frontend renders only what comes back. Revenue-related fields (ARR, MRR, growth rate, churn, CAC, LTV, NRR) are additionally hidden at idea/pre-seed stage regardless of deck type, since they don't exist yet.

Each section in `app/decks/sections.py` (~50 entries) is independent of any one deck type — it defines a renderer id, a PPTX layout hint, a prompt fragment, a pydantic model, and a JSON skeleton injected into the generation prompt. Sections are deliberately decoupled from deck types so adding a new deck type rarely requires new frontend or PPTX code — it's just a new ordered list of existing section keys.

## Rendering (`app/ppt/engine/`)

- **`renderer.py`**: one `PPTRenderer` class, one private method per layout archetype (`_full_bleed`, `_big_number`, `_cards`, `_two_column`, `_timeline`, `_title_bullets`) rather than a class-per-layout factory. `cards` further dispatches internally to a real comparison table, a doughnut chart, or an image gallery grid depending on what data is present.
- **Native charts, not pictures**: a column chart for traction/financials, a horizontal bar for TAM/SAM/SOM (deliberately not a pie — nested, not sibling values), a doughnut for use-of-funds (the one slide where percentages genuinely sum to 100), and a real pptx table for competitor comparisons.
- **`themes.py`**: 32 named color/typography themes across base + "Studio"/"Volume 2"/"Infographic" families, explicitly ported by hand from `frontend/src/components/workspace/deckTemplates/themes.ts` — the two files must be kept in sync manually. Fonts are "safe analog" substitutes (e.g. Segoe UI standing in for Space Grotesk) rather than embedded web fonts, since font embedding in an automated PPTX pipeline was judged too fragile.
- **`template_schema.py`**: validates/caps each `template_data` section independently — a malformed section is dropped with a logged warning rather than invalidating the whole deck, and the renderer falls back to the older flat `SlideContent` fields for that slide if needed.

## Money / currency formatting (`app/core/money.py`)

Shared module used by both the generation prompt and the claims auditor, so every number in a deck and every number checked against it goes through the same formatting rules:

- `Currency = Literal["INR", "USD"]`, driven by the intake form's `currency` field (default INR, legacy projects without the field assumed USD).
- `short_inr()` implements Indian lakh/crore short-form grouping (e.g. `₹1.2 Cr`, `₹80 L`).
- `format_money()` renders the exact figure plus the short form in parens for INR amounts ≥1 lakh, or standard comma-grouped dollars for USD.
- `CURRENCY_GUIDANCE` injects explicit instructions into the generation prompt telling the model never to convert founder-provided INR figures into dollars (or vice versa) and which notation (lakh/crore vs. K/M/B) to use.
