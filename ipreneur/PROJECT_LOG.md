# iPreneur — Project Log

---

## Session: 2026-05-20

### 1. Diagnosed blank workspace page (critical crash)

**Problem:** `WorkspacePage.tsx` crashed immediately on load with:
```
ReferenceError: Cannot access 'projectQuery' before initialization
```
The `refetchInterval` callback referenced `projectQuery` — the same variable being declared by that `useQuery` call — before it was assigned (temporal dead zone).

**Fix:** Replaced the self-referencing closure with React Query v5's query-callback form:
```ts
// Before (crashes)
refetchInterval: () => ACTIVE_STATUSES.has(projectQuery.data?.status ?? "") ? ...

// After (safe)
refetchInterval: (query) => ACTIVE_STATUSES.has((query.state.data as Project)?.status ?? "") ? ...
```
`File: ipreneur/frontend/src/pages/workspace/WorkspacePage.tsx`

---

### 2. Fixed pitch deck generation (Celery not running)

**Problem:** Clicking "Generate Deck" triggered `run_analysis_pipeline.delay()` — a Celery task dispatch. The Celery worker container (`ipreneur_worker`) was not running outside Docker, so all jobs silently sat in the Redis queue indefinitely.

**Fix:** Added `_run_analysis_inline()` — an async function that runs the full pipeline directly inside the FastAPI process using `asyncio.create_task`. Both `POST /projects` (with `start_analysis=true`) and `POST /projects/{id}/analyze` now use this approach.

`File: ipreneur/backend/app/api/v1/endpoints/projects.py`

---

### 3. Fixed CORS blocking frontend on port 3002

**Problem:** Vite dev server landed on port 3002 (3000 and 3001 already in use), but `.env` only listed 3000, 3001, 5173 in `CORS_ORIGINS`.

**Fix:** Added `http://localhost:3002` to `CORS_ORIGINS` in `ipreneur/backend/.env`.

---

### 4. Fixed progress bar showing `undefined%`

**Problem:** `AnalysisProgress.tsx` read `progress.total_progress` directly, but the API client camelizes all responses (`total_progress` → `totalProgress`), so the value was always `undefined`.

**Fix:** Changed to `progress.totalProgress ?? progress.total_progress ?? 0`.

`File: ipreneur/frontend/src/components/workspace/AnalysisProgress.tsx`

---

### 5. Fixed pipeline step names mismatch

**Problem:** Frontend `JOB_STEP_ORDER` had `["analyzing", "formatting"]` but the backend pipeline emits `["rendering", "uploading"]`. The progress stepper highlighted the wrong steps.

**Fix:** Updated frontend constants to match actual backend step names:
```ts
// Before
["crawling", "extracting", "researching", "analyzing", "generating", "formatting"]

// After
["crawling", "extracting", "researching", "generating", "rendering", "uploading"]
```
`File: ipreneur/frontend/src/constants/index.ts`

---

### 6. Added spinner for "analysis starting" state

**Problem:** After creating a project (or clicking Generate Deck), the workspace content area was completely blank until the first status poll resolved (~3 seconds), making users think nothing was happening.

**Fix:** Added a `Loader2` spinner state rendered when `isActive && !jobStatus`.

**Also improved:** Draft empty-state text bumped from near-invisible `text-text-muted` to `text-text-secondary`.

`File: ipreneur/frontend/src/pages/workspace/WorkspacePage.tsx`

---

### 7. Rebuilt Research Agent with live web search

**Problem:** The research agent had no external data sources — it asked Gemini to generate market data from memory, resulting in hallucinated or "Unavailable" values for TAM, competitors, and trends.

**Rebuild:** `research_agent.py` now:
- Runs **5 parallel DuckDuckGo searches** before calling Gemini:
  - Company revenue / funding / valuation
  - Industry market size (TAM) from reports
  - Named competitor analysis
  - Industry trends 2024-2025
  - Customer pain points
- Feeds all real search results into a structured Gemini synthesis prompt
- Returns enriched `ResearchData` with new fields: `pain_points`, `tam_sam_som`, `funding_info`, `recent_news`

`File: ipreneur/backend/app/agents/research/research_agent.py`

---

### 8. Rebuilt Content Agent — 14-slide industry-deep deck

**Problem:** Generic 12-slide prompt produced vague, data-free content disconnected from the actual research.

**Rebuild:** `content_agent.py` now:
- Generates **14 slides** (added Executive Summary, Go-to-Market)
- Each slide has an explicit **layout type**: `full_bleed`, `big_number`, `cards`, `two_column`, `timeline`, `title_bullets`
- All research data (TAM/SAM/SOM, named competitors, pain points, trends) is embedded in the prompt
- Bullets use bold lead-ins (`**Speed:** 10x faster than legacy tools`)
- Cards have `title`, `body`, and optional `metric` field
- `model_dump()` emits both new fields (`slide_type`, `layout`, `cards`, `columns`, `data_points`) and legacy fields (`type`, `content`, `id`) for frontend compatibility

`File: ipreneur/backend/app/agents/content/content_agent.py`

---

### 9. Rebuilt PPT Renderer — Gamma-style visual design

**Problem:** All slides rendered as flat text on a dark background with no visual hierarchy.

**Rebuild:** `renderer.py` now implements 6 layout types:

| Layout | Used for | Key visual |
|---|---|---|
| `full_bleed` | Cover, closing | Centered title, gradient bar top/bottom |
| `big_number` | Market, traction, financials | 3-4 bordered metric cards with large values |
| `cards` | Problem, solution, business model | Cards with colored top-accent bar per card |
| `two_column` | Competitive landscape, features | Two bordered panels with heading + bullets |
| `timeline` | Traction milestones, roadmap | Horizontal dots-on-line flow |
| `title_bullets` | Strategy, team, product | Two-column bullets with colored dot markers |

All slides: left accent bar, slide-type tag, title hierarchy, speaker notes preserved.
Bold text syntax (`**text**`) renders as styled runs in PPTX.

`File: ipreneur/backend/app/ppt/engine/renderer.py`

---

### 10. Rebuilt DeckPreview — rich interactive web preview

**Problem:** The preview showed a basic list of slide titles with truncated body text — no visual structure or layout context.

**Rebuild:** `DeckPreview.tsx` now:
- Renders each slide matching its `layout` type (cover, big-number cards, card grid, two-column, bullets)
- **Single slide view** with prev/next navigation and dot indicators
- **Grid view** toggle to browse all slides at once
- Bold text rendering (`**bold**` → `<strong>`)
- Speaker notes panel below active slide
- Metric cards with colored borders matching slide accent colors

`File: ipreneur/frontend/src/components/workspace/DeckPreview.tsx`

---

### Infrastructure note

The full stack runs via Docker Compose (`ipreneur/docker-compose.yml`):
- `ipreneur_backend` — FastAPI on port 8000 (volume-mounted, hot-reload)
- `ipreneur_worker` — Celery worker (Redis broker)
- `ipreneur_postgres` — PostgreSQL
- `ipreneur_redis` — Redis
- `ipreneur_minio` — MinIO object storage
- `ipreneur_frontend` — Vite dev server on port 3000 (also accessible 3001/3002)

Backend code changes take effect immediately via the volume mount + uvicorn `--reload`.
`.env` changes require `docker restart ipreneur_backend`.

---

## Session: 2026-05-21

### 11. Implemented full 6-layer AI architecture

**Objective:** Upgrade from a 3-step research→content pipeline to a proper investment-grade architecture matching the spec:
1. Website Intelligence Layer
2. External Research Layer (already done in session 1)
3. AI Analysis Layer (new)
4. Pitch Deck Generation Layer (enhanced)
5. Output Rules (confidence scores, no hallucinations)
6. System Optimization (modular agents)

---

### 12. New: AI Analysis Agent (Layer 3)

**File:** `ipreneur/backend/app/agents/analysis/analysis_agent.py`

New agent that synthesizes research into investor-grade analysis. Sits between research and content generation — the pitch writer draws from pre-synthesized investor logic rather than raw data.

**Outputs:**
- `positioning` — One sharp statement: "X is the [category] for [ICP] that [differentiator], unlike [incumbent]"
- `icp` — Full ICP profile: company size, vertical, job titles, primary pain, budget range, buying trigger
- `competitive_moat` — Defensible advantages analysis
- `market_opportunity` — TAM/SAM + "why now" argument
- `revenue_scenarios` — Conservative/Base/Optimistic Y1-Y3 ARR
- `scalability` — Unit economics and expansion vectors
- `gtm_strategy` — 4 specific channel tactics
- `swot` — Full SWOT matrix with evidence
- `investor_score` — 1-10 with summary, highlights, concerns
- `risk_factors` — Risk list with severity (high/medium/low) + mitigation
- `confidence` — Per-field confidence scores (0-100)

**Confidence scoring:**
- 85-100: Verified from website / multiple sources
- 65-84: Reasonably inferred
- 40-64: Estimated from industry norms
- 0-39: Speculative — flagged with "(estimated)"

**Prompt framing:** "You are a General Partner at Sequoia/a16z conducting due diligence."

---

### 13. Enhanced BrandingExtractor — Website Intelligence Layer

**File:** `ipreneur/backend/app/services/branding/extractor.py`

Added 5 new fields to `BrandingData`:
- `tech_stack: list[str]` — technologies detected from page (logos, "built with", job listings)
- `competitors_mentioned: list[str]` — companies mentioned in "vs", "alternative to", comparison pages
- `testimonials: list[dict]` — up to 3 real customer quotes with author + metric
- `pricing_model: dict` — model type, tiers, notes (annual discount, trial period)
- `business_model: str` — how they make money (SaaS, marketplace, transaction fee, freemium)

Updated Gemini extraction prompt with explicit rules for each new field:
- tech_stack: look for logos, "built with", "powered by", footer links
- competitors_mentioned: look for "vs", "alternative to", "unlike", "switch from"
- pricing_model.tiers: extract any price numbers or tier names
- testimonials: extract up to 3 with metrics if present
- Rule: "If no evidence on page, return [] or {} — do NOT invent data"

---

### 14. Pipeline updated — new analyzing step

**File:** `ipreneur/backend/app/api/v1/endpoints/projects.py`

Added `AnalysisAgent` as step 4 in the 7-step pipeline:

| Step | Progress | Status |
|---|---|---|
| crawling | 0→15% | unchanged |
| extracting | 15→30% | unchanged |
| researching | 30→50% | was 30→55% |
| **analyzing** | **50→65%** | **NEW** |
| generating | 65→80% | was 55→80% |
| rendering | 80→95% | unchanged |
| uploading | 95→100% | unchanged |

Analysis result is passed to `ContentGenerationAgent.generate(analysis=analysis_data)`.
Analysis is persisted embedded in `research_data["analysis"]` (no new DB column needed).

---

### 15. ContentGenerationAgent — analysis-enriched prompt

**File:** `ipreneur/backend/app/agents/content/content_agent.py`

`generate()` now accepts `analysis: Optional[AnalysisData] = None`.

When analysis is present, a full "INVESTOR ANALYSIS" block is injected into the Gemini prompt containing:
- Positioning statement
- Investor score + highlights + concerns
- Full ICP (who, company size, buyers, pain, budget, trigger)
- Competitive moat
- SWOT matrix
- GTM strategy (4 channels)
- Revenue scenarios (Y1-Y3)
- Top 3 risk factors with severity + mitigation

The model is instructed to use this for specific slides:
- ICP → slide 3 (problem/pain points)
- Positioning + moat → slide 10 (competitive landscape)
- Revenue scenarios → slide 12 (financials)
- GTM → slide 9 (go-to-market)
- SWOT strengths → slide 4 (solution)

Business model, tech stack, and pricing signals from the enhanced `BrandingData` are also injected.

---

### 16. Frontend — analyzing step added

**File:** `ipreneur/frontend/src/constants/index.ts`

Added `"analyzing"` between `"researching"` and `"generating"` in `JOB_STEP_ORDER`.
Added label: `"analyzing": "Analyzing investor potential"`.
Progress bar now shows 7 steps correctly aligned with backend pipeline.

---

## Session: 2026-05-21 (continued — end-to-end test & bug fixes)

### 17. New Gemini API key + full integration test

**Fix:** Replaced exhausted Gemini API key in `ipreneur/backend/.env`.
**Restart required:** `docker restart ipreneur_backend` (`.env` changes are not hot-reloaded).

**Test target:** `https://www.notion.so`  
**Result:** Full 7-step pipeline passing with real data:

| Step | Result |
|---|---|
| crawling | ✅ 3 pages, 20 images |
| extracting | ✅ Notion (SaaS) — business model, pricing model, tech stack |
| researching | ✅ $600B+ enterprise software market, 4 competitors, 4 trends |
| analyzing | ✅ score=7/10, 4 strengths, 4 risks |
| generating | ✅ 14 slides |
| rendering | ✅ 54,657 bytes PPTX |
| uploading | ✅ Pipeline complete |

---

### 18. Bug fix — JSON trailing commas in all agents

**Problem:** Gemini occasionally outputs trailing commas before `}` or `]` (e.g. `["item1", "item2",]`), which is valid JavaScript but invalid JSON. `json.loads()` raised `Expecting ',' delimiter` parse errors in the research, analysis, and content agents.

**Fix:** Added `re.sub(r",\s*([}\]])", r"\1", json_str)` before every `json.loads()` call in all three agents:
- `ipreneur/backend/app/agents/research/research_agent.py`
- `ipreneur/backend/app/agents/analysis/analysis_agent.py`
- `ipreneur/backend/app/agents/content/content_agent.py`

**Analysis agent extra:** Added `_repair_json()` method to also handle truncated output (closes unclosed braces/brackets if Gemini hits max token limit mid-response).

---

### 19. Bug fix — bullet_points returned as dicts by Gemini

**Problem:** Content agent prompt asks for `bullet_points: ["string", ...]` but Gemini occasionally returns objects: `[{"text": "**Bold:** description"}, ...]`. The PPTX renderer called `re.sub()` on the dict, crashing with `TypeError: expected string or bytes-like object, got 'dict'`.

**Traceback location:** `renderer.py:_bullet_row → _txt → re.sub` called with a `dict`.

**Fix:** Added module-level `_str()` normalizer in `content_agent.py`:
```python
def _str(v) -> str:
    if isinstance(v, dict):
        return v.get("text") or v.get("content") or v.get("value") or str(v)
    return str(v) if v is not None else ""
```

Applied to all string fields during slide parsing: `title`, `subtitle`, `body`, `speaker_notes`, and every item in `bullet_points`. This makes the content agent resilient to Gemini returning objects where plain strings are expected.

**File:** `ipreneur/backend/app/agents/content/content_agent.py`

---

## Session: 2026-05-25

### 20. Verified local auth + deck generation flow

**Objective:** Confirm the end-to-end local UI auth flow and pitch deck generation using the running frontend and backend.

**Results:**
- Local auth `/api/v1/auth/register` and `/api/v1/auth/login` were validated.
- Frontend login using persisted local credentials succeeded.
- Created a new project from `/projects/new` for `https://www.zomato.com`.
- The generated project reached `Ready` status in-browser at `/projects/43c80248-9f67-4fde-9635-bd54152cb576`.
- UI showed the deck preview, `Edit Deck`, and `Export PPTX` controls.

**Notes:**
- This confirms the local stack is functional for protected user flows and project generation.
- Next step is exporting the PPTX and validating the final presentation artifact.

---

## Session: 2026-08-19

**Architecture note:** the pipeline described in Sessions 1–2 above (Celery worker,
MinIO, a separate Research/Analysis/Content agent chain, DuckDuckGo search) has
since been superseded. The live pipeline as of this session is: a single
`MasterDeckAgent` (two-pass Gemini call — research then generation, using
Gemini's own Google Search grounding instead of DuckDuckGo), running inline in
a background thread with its own event loop (no Celery), against **Supabase**
for both Postgres and file storage (no local Docker Postgres/MinIO required
for dev). `docker-compose.yml` still exists but is no longer the dev path.

---

### 21. Fixed "Future attached to a different loop" crash on every analysis run

**Problem:** `_run_analysis_inline` runs in a dedicated background thread with
its own asyncio event loop (not Celery). `WebCrawler.crawl()` was looking up
the project's URL via `get_db_context()`, which binds to the **main** uvicorn
event loop's DB engine — awaiting that connection from a different loop threw
`RuntimeError: Future ... attached to a different loop` on essentially every
generation attempt.

**Fix:** Changed `WebCrawler.crawl()` to use `get_background_db_context()`
(creates a loop-scoped engine) instead. `File: ipreneur/backend/app/services/crawler/web_crawler.py`

---

### 22. Fixed "Parsed deck JSON has no slides" — Gemini thinking-budget misconfiguration

**Problem:** `.env` had `GEMINI_THINKING_BUDGET=8192` equal to
`GEMINI_MAX_TOKENS=8192`. For `gemini-2.5-flash`, thinking tokens count
against `maxOutputTokens` — with the budgets equal, the model spent the
entire token budget "thinking" and returned an empty/truncated response, so
the deck JSON had no `slides` key.

**Fix:** `GEMINI_MAX_TOKENS` → 32768, `GEMINI_THINKING_BUDGET` → 2048 (both in
`.env` and the stale `.env.example`, which had the same landmine for any
fresh setup). Also bumped the Python-level default in `config.py` from 8192
→ 16384 as a safety net.

---

### 23. No-website intake flow — decks for idea-stage companies

**Objective:** Let a founder with no live website yet generate a deck from a
structured questionnaire instead of a crawled URL.

**Built:**
- `NewProjectPage.tsx`: new "I don't have a website yet" toggle reveals
  required fields (problem statement, solution description, target customer,
  a repeatable founders list) plus optional traction/competitor notes.
- Backend: `company_url` made nullable end-to-end (`ProjectCreate`, `Project`
  model + one-time `ALTER TABLE` against Supabase); `_run_analysis_inline`
  skips crawling when no URL is present (previously silently crawled
  `https://example.com` as a fallback — removed).
- `master_agent.py`: fixed a live `NameError` in `_research_pass`'s call to
  `_team_search` (`company_name` was never defined in scope) — was firing on
  every company web search couldn't find, silently degrading research to
  `{}`. Manually-entered founders now take priority over web-search results
  for the Team slide (search on a generic company name easily returns an
  unrelated company's founders — self-reported data is more trustworthy here).
- Prompt: added a "founder-provided company description" block that replaces
  the crawled-website section when there's no URL.

`Files: frontend/src/pages/workspace/NewProjectPage.tsx, backend/app/schemas/project.py, backend/app/models/models.py, backend/app/api/v1/endpoints/projects.py, backend/app/agents/master/master_agent.py`

---

### 24. Fixed silent textarea validation failure (Input.tsx)

**Problem:** The shared `Input` component's `multiline` (textarea) mode never
forwarded React Hook Form's `ref` — only the plain `<input>` branch did.
Typed text updated the DOM but never reached RHF's tracked form values, so
required-textarea validation (problem/solution statement above) always
reported empty, blocking submission no matter what was typed. `multiline` had
never been exercised anywhere in the codebase before this session.

**Fix:** Forward `ref` to both the `<input>` and `<textarea>` branches.
`File: frontend/src/components/ui/Input.tsx`

---

### 25. Wired real file storage to Supabase Storage

**Problem:** Generated `.pptx` files were always landing on local disk
regardless of any S3/MinIO config — root cause was `boto3` never being
installed (not even listed in `requirements.txt`), so every upload attempt
hit `ModuleNotFoundError`, caught by a broad `except`, silently falling back
to local save.

**Fix:** Installed `boto3` (added to `requirements.txt`), pointed `.env`'s S3
config at Supabase Storage's S3-compatible endpoint, and flipped the `decks`
bucket's `public` flag directly in `storage.buckets` (the S3 protocol can't
set that itself). Also fixed the `/presentations/{id}/download` fallback
path, which parsed the storage object key out of `file_url` by splitting on
`/storage/` — worked for old local paths, broke on real Supabase URLs (which
contain `/storage/` earlier in the path for an unrelated reason); now derives
the key directly from the known `{project_id}/presentation.pptx` convention.

Verified end-to-end with a real generation run — confirmed public download,
correct byte size, correct content-type.

---

### 26. Migrated pre-Supabase local data

**Found:** A leftover `ipreneur.db` SQLite file from before the Supabase
migration, holding 1 orphaned user account and 1 incomplete project ("nvest",
movate.com — had hit the exact bug from #22). Migrated the project into the
current Supabase account (status set to `error` with an explanatory message,
so "Retry Analysis" regenerates it cleanly now that the underlying bug is
fixed).

---

### 27. Pitch deck quality upgrade — Phase 1 (renderer + prompt)

**Objective:** The AI already generates a rich `template_data` payload (KPI
highlights, real market/traction numbers, a competitor matrix, founder bios)
for the 10-theme web preview — but the actual downloadable `.pptx`
(`PPTRenderer`, python-pptx) only ever read the flatter `slides[]` payload,
silently discarding all of that.

**Built:**
- `template_data` now flows into `PPTRenderer.render()` (new
  `template_schema.py`: pydantic validation per-section, so one malformed
  section degrades one slide instead of breaking the deck).
- Real native charts replace decorative fakes: TAM/SAM/SOM was 3 overlapping
  ovals with **hardcoded** ring sizes that didn't scale with the real
  numbers — now a real, correctly-scaled bar chart. Added a traction column
  chart and an ask-allocation doughnut chart (both previously absent), and a
  real competitor comparison table (previously generic cards).
- Brand colors now actually apply (the `branding` param was accepted by
  `render()` but never read before).
- Per-theme title fonts (body text stays on the proven Calibri baseline).
- Fixed logo distortion (now aspect-correct) and a silent SVG-logo failure
  (python-pptx can't embed SVG; now decodes via Pillow or logs why it's
  skipped, instead of failing silently).
- Deleted `theme_engine.py`/`slide_factory.py` — an abandoned earlier
  renderer attempt, unused, still had literal `# TODO` stubs in it.
- Added a "specificity rule" to the generation prompt targeting generic,
  swappable-company AI-deck language, reinforced on the Product/Business-
  Model/Market slides specifically.

Verified with real Gemini generations + direct XML inspection of the output
files (chart types, table structure, brand-color contrast, font names).

`Primary file: backend/app/ppt/engine/renderer.py` (+ `themes.py`, `template_schema.py` new, `master_agent.py`)

---

### 28. Inline deck text editing — `/projects/:id/editor` is no longer a stub

**Objective:** Let a founder click into any slide's title/bullets/KPI
numbers and fix them directly, then save — no layout/image/theme changes.
(`EditorPage.tsx` had been a stub since the very first commit to this repo —
confirmed via git log — and was explicitly listed as a TODO in this log's
own Session 2026-05-20 entry, never revisited until now.)

**Built:**
- `TemplatedDeck.tsx`'s ~13 slide-builder functions now accept an `EditCtx`
  (default no-op, so every existing caller — theme thumbnails, PPTX export —
  is unaffected). Editable text renders as a clickable marker; a portaled
  floating `<input>`/`<textarea>` (new `FloatingTextEditor.tsx`) positions
  itself over the real on-screen glyph and edits at a legible fixed size
  regardless of the (often heavily scaled-down) preview zoom.
- The traction chart's on-chart numbers (SVG `<text>`, not plain DOM text)
  get the same treatment via `<tspan>` + `getScreenCTM()`/`getBBox()`
  coordinate math — no separate interaction pattern needed for the one
  trickier slide.
- New `setByPath.ts` — immutable path-based updates to the local edit draft.
- Backend: `ProjectUpdate.template_data` + a two-level merge in
  `update_project` (preserves `deck_content.slides`; a section that fails
  re-validation on save keeps its last-known-good value instead of
  vanishing, since the frontend renderer mostly doesn't guard against a
  missing section). The existing `/download` endpoint already re-renders
  from `deck_content` on every call — saved edits show up in PPTX downloads
  with no further changes needed there.

`Files (new): frontend/src/components/workspace/deckTemplates/editing/{editableText,FloatingTextEditor,setByPath}, frontend/src/pages/editor/EditorPage.tsx`
`Files (changed): TemplatedDeck.tsx, TemplatedDeckSection.tsx, services/api/projects.ts, backend/app/schemas/project.py, backend/app/api/v1/endpoints/projects.py`

**Not yet verified in a live browser** (no browser automation tool available
this session) — TypeScript compiles clean, backend merge logic tested
directly against real DB rows, but the interactive click → edit → save flow
itself still needs a hands-on pass.

---

### 29. Fixed multiline paragraph fields breaking in the inline editor

**Problem:** `FloatingTextEditor` (built in #28) had full `<textarea>` support,
but no `editableText()` call site anywhere in `TemplatedDeck.tsx` ever passed
`{ multiline: true }` — so every field, including 3-line paragraphs like the
executive summary lead, rendered as a single-line `<input>`. Combined with an
auto `.select()` on focus, clicking into a paragraph showed a broken,
horizontally-scrolled fragment of the text instead of the full wrapped block.

**Fix:**
- `FloatingTextEditor.tsx` now auto-detects multiline from the marker's own
  measured height (`rect.height > fontSize × 1.6` ⇒ wrapped text), so any
  field that visually wraps gets a `<textarea>` automatically, independent of
  whether a call site remembered to flag it.
- Multiline sizing now matches the source render instead of guessing: width
  hugs the original wrapped column (no growth-room padding, which would
  re-wrap text at different points than the real deck), and line-height is
  copied from the field's own computed style rather than a constant.
- Select-all-on-focus is now skipped for multiline fields (still used for
  short ones) — clicking into a paragraph no longer risks wiping it on the
  next keystroke.
- Explicitly flagged the 16 known-paragraph fields (summary lead,
  problem/solution body + footer text, subtitles across
  product/probsol/roadmap/gallery/ask/closing, model stream/tier
  descriptions, market note, team bios/advisors, roadmap item descriptions)
  with `multiline: true` directly, so they get a textarea from the first
  click even while their current generated content is still short.
- Follow-up: removed the native `resize: vertical` drag-handle from
  multiline fields — it showed up as a small, unexplained grip icon inside
  the text (e.g. after a wrapped headline), which read as a UI glitch and
  broke the "no visible chrome" editing feel from #28. `minHeight` is already
  sized from the real measured block, so manual resize wasn't needed; native
  textarea scrolling still handles typed text that grows past it.

`File: frontend/src/components/workspace/deckTemplates/editing/FloatingTextEditor.tsx`
(+ 16 call-site flags in `TemplatedDeck.tsx`)

---

## Session: 2026-09-08

**Environment note:** no code changes this session — infra/connectivity
triage only. Decision made to stay on **Supabase Postgres permanently**; the
SQLite fallback in `session.py` is not a supported dev path going forward.

---

### 30. Removed live credentials committed to `.env.example`

**Problem:** `backend/.env.example` carried a full `#___original` block with
**real** secrets (Supabase DB password, anon key, S3 access/secret keys),
committed in `e346ba6`.

**Fix:** Deleted the block; committed as `261359c` and pushed to
`origin/main`. **Not remediated:** the secrets remain in git history
(`e346ba6` and earlier) and on GitHub — they should be rotated (Supabase DB
password, S3 keys, anon key) and history scrubbed (`git filter-repo` / BFG).

---

### 31. Diagnosed Supabase connection failures on `uvicorn` startup

Backend refused to start — `init_db()` → asyncpg connect failing. Two
distinct causes, in sequence:

**a) Project auto-paused.** Error: `asyncpg.exceptions.InternalServerError:
(ENOTFOUND) tenant/user postgres.lrorjoorubequalcufhb not found`. The
Supavisor pooler returns this when the project is inactive — free-tier
Supabase projects pause after ~1 week idle. Project `lrorjoorubequalcufhb`
("Pitch Deck", region `ap-northeast-1`) showed `status: INACTIVE`. Resolved
by restoring it from the dashboard.

**b) Local DNS resolution failure.** After restore, error changed to
`socket.gaierror: [Errno 11001] getaddrinfo failed` resolving
`aws-0-ap-northeast-1.pooler.supabase.com`. Verified from outside the machine
that the host resolves (`35.79.125.133 / 52.68.3.1 / 54.64.190.72`, behind an
AWS ELB) and TCP 5432 is open — so this is the Windows box's DNS resolver,
not Supabase or the app. Fix: point the network adapter's DNS at
`1.1.1.1` / `8.8.8.8` + `ipconfig /flushdns` (some ISPs fail to resolve the
`*.pooler.supabase.com` CNAME on their default resolver); a
`hosts`-file pin to one ELB IP works as a stopgap but goes stale if the IP
rotates.

**Temporary detour (reverted):** `.env` `DATABASE_URL` was briefly switched
to `sqlite+aiosqlite:///./ipreneur.db` to unblock local work, then restored
to the Supabase pooler URL per the "stay on Supabase" decision. While on
SQLite, a local-only `abhi@gmail.com` user row was inserted into
`ipreneur.db` (bcrypt hash supplied directly) — it exists only in that local
file and has no effect on Supabase.

---

## Session: 2026-09-16

### 32. Rebuilt Hero Section & Background Image Integration

**Context:** Redesigned the landing page Hero section to feature the "Summit / Ambitious Founders" visual identity with a high-resolution mountain peak background and streamlined layout.

**Changes:**
- **Background Asset:** Installed and configured high-definition sunset mountain asset at `public/images/ipreneur-summit-bg.jpg`.
- **Hero Architecture:** Simplified layout to a clean 2-column structure:
  - Left column: Eyebrow badge ("FOR AMBITIOUS FOUNDERS"), large hero headline ("A clearer story for a bigger tomorrow"), deck generator input row, and 3-point feature checklist.
  - Right column: "Ideas today. Impact tomorrow." cursive handwritten script with a curved arrow over the mountain vista.
  - Bottom: Social proof / trust bar with partner and ecosystem marks.

`Files: frontend/src/components/landing/HeroSection.tsx`, `frontend/src/components/landing/HeroSection.css`

---

### 33. Synchronized Hero Typography with Global Design Tokens

**Problem:** Hero section initially loaded hardcoded `Inter` fonts, resulting in visual inconsistency with the rest of the application's design system.

**Fix:**
- Replaced font declarations with CSS variable tokens:
  - `var(--font-display)` (`Gabarito`): Applied to the hero headline (`.hero-title`), logo mark (`.hero-logo-mark`), CTA buttons (`.hero-start-free`, `.hero-build-btn`), eyebrow, and trust label.
  - `var(--font-body)` (`Hanken Grotesk`): Applied to the hero container, navigation links, descriptions, inputs, and checklist.

`File: frontend/src/components/landing/HeroSection.css`

---

### 34. Harmonized Hero Colors to Minimalist Monochrome Theme

**Context:** The rest of the landing page uses a signature Minimalist Monochrome (Black & White with cool zinc/slate accents) palette. The hero was tuned to seamlessly blend into this design.

**Changes:**
- **Overlay:** Switched overlay gradient from tinted navy to pure deep black (`rgba(0, 0, 0, 0.96)`) on the left, fading into the mountain photography on the right.
- **CTA Button:** Styled the primary "Build my deck" button as a solid white pill with crisp black text (`bg-white text-black`), matching the bottom CTA on the landing page.
- **Headline Gradient:** Shifted to a clean monochrome silver/white gradient (`#ffffff` → `#e4e4e7` → `#a1a1aa`).
- **Input & Icons:** Clean translucent frosted glass with a crisp white focus ring, and all icons/checkmarks unified in monochrome white.

`Files: frontend/src/components/landing/HeroSection.tsx`, `frontend/src/components/landing/HeroSection.css`


---

### 35. Reviewed `Pitch Deck Parameters.docx` — spec vs. app gap analysis

**Context:** A new spec landed at the repo root defining the intended deck
catalogue and data model. Parsed it in full (5,994 lines of extracted text)
and mapped it against what is actually built.

**The gap:**

| | Spec | App today |
|---|---|---|
| Deck types | 9 (+5 "upcoming") | 7 |
| Name overlap | — | only **Investor** and **Product** |
| Parameters | ~470 unique in 28 master groups (~2,600 rows across all decks) | ~23 collected intake fields |

Parameter groups per deck type, parsed from the doc: General 12 · Investor 19 ·
Business 19 · Elevator 12 · Product 19 · Demo Day 13 · **Extended/Master 28** ·
GTM 26 · **Appendix 30**. The Master deck's 28 groups are the superset — every
other deck is a selection over it.

**The one architectural violation.** The spec's central instruction is
*"Parameters are the raw business data. They should not be tied one-to-one with
slides"* and *"Master Deck collects everything once → other deck types reuse the
same parameters selectively."* The app breaks this in exactly one place: founder
answers live in `projects.branding_data`, a flat untyped dict scoped to **one
project**. Generating a second deck means re-entering everything.

**What is already well-positioned** (no rework needed):
- `app/decks/registry.py` already made "a deck type declares its slide sequence
  once" true — adding deck types is cheap.
- 27 section keys already share only 16 renderers, so most new slides need
  prompt text and no new code.
- `deck_content.slide_order` already persists per-deck orders and wins at render
  time, so the spec's **dynamically-sized Appendix deck needs no renderer
  change** — it fits the existing architecture as-is.

**Decisions taken:** keep all 7 existing types and add the 6 missing (→13, with
`appendix` a 14th special case); build a persistent, AI-pre-filled Company
Profile rather than a bigger form; evidence/traceability layer in scope.

**Plan:** `~/.claude/plans/pitch-deck-parameters-docx-so-iridescent-mango.md`
— six phases (0 repairs · 1 parameter model · 2 profile UI · 3 new deck types ·
4 selection engine · 5 evidence + Appendix).

**Note on the spec:** it calls for an "R / C / O / A / N mapping for every
parameter across all 9 deck types" but never defines the letters. Read as
**R**equired / **C**onditional / **O**ptional / **A**uto-derived / **N**ot
applicable — worth confirming with the author.

`File: Pitch Deck Parameters.docx` (repo root)

---

### 36. Phase 0 — repaired silently-degrading render paths and a broken type-check

Groundwork before the parameter work; all of these were pre-existing defects
found during the review above.

**a) Three template_data sections never reached the PPTX renderer.**
`proof.cases` (sales), `persona.jobs`/`persona.pains` (product) and
`galleryS.slots` had no path through `renderer.py`: the builders sniffed the
`td` dict for shapes they didn't recognise and fell through to
`_title_bullets`, so those slides rendered **empty** in every download. Nothing
errored — the deck just quietly lost a slide's worth of content.

- `_resolve_cards` now understands `proof.cases` (headline metric + customer +
  before/after detail + quote).
- `_two_column` now understands the persona shape, mapping `jobs` → *Jobs to Be
  Done* and `pains` → *Today's Friction*, with `who` filling the header subtitle
  when the AI left it empty.
- New `_gallery_frames` builder draws the span-aware 4×2 grid of captioned
  placeholders, mirroring `TemplatedDeck.tsx`'s `gallerySlide`.

**b) Every deck type was footed "Investor Presentation • Confidential."**
`_full_bleed` already receives the whole `template_data` dict, whose passthrough
`eyebrow` key holds the real label ("Sales Presentation", "Partnership
Proposal", …) — it was simply never read.

**c) `npm run type-check` was failing on `main`** (3 errors, so there was no
clean baseline to build on):
- `Select.tsx` spread `placeholder` onto `<select>`, which has no such
  attribute. Declared it on `SelectProps` and destructured it out — it renders
  as the empty leading `<option>`.
- `BrandingData` declared 5 branding fields, but the blob also carries the
  founder's intake answers (the backend merges `{**_user_input, **branding_data}`
  after generation). Typed what is actually there, in both camel and snake case,
  and dropped the two `as any` casts in `BrandingPanel.tsx`.

**Verification:** new `backend/test_renderer_sections.py` renders a real .pptx
in memory and asserts the content lands on the slide — the registry unit tests
could not have caught this class of regression. 13 new tests; suite now
**202 passed**. (2 pre-existing failures in `test_analysis.py` /
`test_thread_exec.py` are a pytest-asyncio config issue, unrelated.)
`npx tsc --noEmit` now exits clean.

**Still open in Phase 0:** uploaded gallery photos are stored in
`projects.assets` but never plumbed into `PPTRenderer.render()`, so the PPTX
shows placeholders where the on-screen deck shows real images — deliberately
left out of scope rather than silently widening the phase. Also pending:
surfacing the 8 `CompanyIntake` fields (`founded_year`, `team_size`,
`growth_rate_mom_pct`, `cac_usd`, `ltv_usd`, `churn_rate_pct`, `nrr_pct`,
`round_type`) that the prompt already formats but the form never collects.

`Files: backend/app/ppt/engine/renderer.py`, `backend/test_renderer_sections.py` (new),
`frontend/src/components/ui/Select.tsx`, `frontend/src/types/index.ts`,
`frontend/src/components/workspace/BrandingPanel.tsx`

---

### 37. Phase 0 complete — gallery photos, download-path bugs, orphaned fields

Finished the two items left open in #36, and fixed two further defects found
while wiring them.

**a) Uploaded gallery photos now reach the PPTX.** `PPTRenderer.render()` had no
`assets` parameter at all, so the downloaded deck drew captioned placeholders
where the on-screen deck showed real images. Added `read_asset_bytes()` /
`load_gallery_bytes()` (reading from `backend/uploads/` on disk — the URLs are
relative `/uploads/...` paths that httpx cannot fetch), threaded `gallery_bytes`
through `render()` → `_cards()` → `_gallery_frames()`, and added
`_place_cover_image()`, which crops to fill rather than stretching (python-pptx
distorts any picture given an aspect it doesn't match).

A test caught a flaw in the first attempt: the positional fallback re-used a
photo that a later slot claimed by id, placing the same image twice. Each photo
is now claimed at most once.

**b) Two bugs in `GET /presentations/{id}/download`**, both found while adding
the gallery to it:
- It passed no `sections`, so the renderer fell back to the **investor**
  sequence — every non-investor deck re-rendered there mapped `template_data` to
  the wrong slides. It now uses the deck's stored `slide_order`.
- The uploaded logo was fetched with `fetch_image_bytes(logo_url)` on a relative
  `/uploads/...` path, which httpx cannot resolve — so an uploaded logo never
  appeared on a downloaded deck. Now read from disk, with the HTTP fetch as the
  fallback for absolute URLs.

**c) The 8 orphaned intake fields are collected and consumed.** `founded_year`,
`team_size`, `growth_rate_mom_pct`, `cac_usd`, `ltv_usd`, `churn_rate_pct`,
`nrr_pct` and `round_type` now appear on the form — and, crucially, the live
prompt reads them. `CompanyIntake.to_prompt_section()` formatted them but the
live pipeline builds its own financials block and was dropping them, so
collecting them alone would have changed nothing. LTV:CAC is derived.

`Files: backend/app/ppt/engine/renderer.py`, `backend/app/services/storage/assets.py`,
`backend/app/api/v1/endpoints/{projects,presentations}.py`,
`backend/app/agents/master/master_agent.py`, `frontend/.../NewProjectPage.tsx`

---

### 38. Phase 1 — the master parameter model

The spec's central instruction is that parameters are collected **once per
company** and selected from per deck. That now exists.

**Generated, not transcribed.** `scripts/gen_parameters.py` parses the .docx and
emits `backend/app/profile/parameters.py`: **49 groups, 924 unique parameters**.
Hand-typing ~900 rows would be unverifiable against the source; the generator is
the audit trail — re-run it after the spec changes and diff. Field types are
inferred from each row's label and its "Data" description (the doc has no type
column), with corrections in an `OVERRIDES` table so they survive regeneration.

Two parser bugs worth recording, both found by the counts not matching the doc:
- The stop-rule was checking the *description* column too, so rows whose data
  reads like prose ("If fundraising") truncated their table early — Founder &
  Team collapsed from 19 parameters to 1.
- Each deck's last table is followed by a "… — Core Data Architecture" heading
  and a bullet list, which the parser read as more rows (Contact & Closing
  picked up 25 instead of 13).

The GTM and Appendix decks re-express master concepts under their own headings,
which produced 81 near-duplicate groups on the first pass. A `MERGE_INTO` table
folds them into the owning master group, keeping one home per fact.

**`relevance.py` — the spec's R/C/O/A/N map.** The doc asks for this mapping but
never defines the letters; read as Required / Conditional / Optional /
Auto-derived / Not-applicable and **recorded as an assumption to confirm**.
Declared at group level with per-parameter overrides: 14 deck types × 49 groups
is maintainable, 14 × 924 would not be. The spec's conditional rules live here
rather than scattered through the prompt — pre-revenue companies are never
*required* to supply a revenue figure, and validation evidence is promoted to
Required in its place.

**`values.py` — provenance, not bare scalars.** Every value is
`{value, source, method, confidence, as_of}` with source ∈ founder / crawl /
research / derived. This is the input half of the evidence layer: the Appendix
deck can only trace a claim if provenance was captured at input time. A crawl or
research pass can never silently overwrite a founder-confirmed answer. Derived
values (LTV:CAC, implied ARR, runway) are computed, never asked for, and never
counted as gaps.

**`prompt.py`** emits only the groups a given deck consumes — on a
924-parameter catalogue that is the difference between a usable prompt and one
that blows the token budget — and tags non-founder provenance so the model can
attribute rather than stating everything in one flat voice.

**Storage:** new `company_profiles` table + `projects.profile_id`, with the
migration appended to `scripts/db/init.sql` in the existing style (there is
still no Alembic). Fully back-compatible: a project with no `profile_id` reads
`branding_data` exactly as before.

**API:** `GET/POST /profiles`, `GET/PATCH/DELETE /profiles/{id}`,
`GET /profiles/schema` (what the form renders from) and
`GET /profiles/{id}/readiness` (what a deck still needs). One bug caught by the
API tests: with no `deck_type` every parameter resolved to "N", so the
unfiltered schema returned almost nothing.

`New: backend/app/profile/{parameters,relevance,values,prompt}.py`,
`backend/app/api/v1/endpoints/profiles.py`, `scripts/gen_parameters.py`,
`backend/test_profile.py`, `backend/test_profile_api.py`

---

### 39. Phase 3 — six new deck types (13 total)

| key | slides | new sections |
|---|---|---|
| `general` | 12 | none |
| `elevator` | 5 | none |
| `demoday` | 10 | none |
| `gtm` | 16 | 9 |
| `business` | 16 | 4 (shared) |
| `master` | 25 | 6 |

**Three of the six needed no new code at all** — they are section lists over the
existing catalogue. The 18 new section keys all route through **renderers that
already exist** (`positioning`→`probsol`, `segmentation`→`competition`,
`unitEconomics`→`traction`, `funnel`→`roadmap`, …), so no new React components,
no new pydantic models and no new PPTX layouts were required. That is the payoff
of `sections.py` keeping section keys separable from renderers.

The frontend mirror in `deckTemplates/deckTypes.ts` was generated from the
backend registry rather than hand-copied, which is what
`test_deck_registry_frontend_sync.py` exists to enforce — it failed with 26
errors until the mirror matched, then passed.

`elevator` and `demoday` carry explicit guidance that they must **not** be
compressed investor decks, which the spec is emphatic about; `demoday` also gets
idea/pre-revenue stage overrides that swap traction for vision.

**Verified:** all 13 deck types build their prompt, produce a `template_data`
skeleton that passes the validator, and render to a real .pptx of the right
slide count — `master` at 25 slides / 95KB down to `elevator` at 5 / 40KB.
384 unit tests pass; frontend type-check and build clean.

`Files: backend/app/decks/{sections,registry}.py`,
`frontend/.../deckTemplates/deckTypes.ts`, `frontend/.../NewProjectPage.tsx`

---

## Session: 2026-09-18

### 40. Redesigned Sign Up / Register Page to Match Login Page Design

**Problem:** The Register page (`/register`) was previously a plain, minimal centered box with basic HTML inputs, missing the rich 3-column layout, background illustrations, rocket motif, and polished input styles of the Login page (`/login`).

**Fix:**
- Rebuilt `RegisterPage.tsx` using the exact same design language and 3-column desktop layout as `LoginPage.tsx`:
  - **Left column:** Motivational founder marketing typography ("Ideas today. Impact tomorrow.", "A startup accelerator for bold builders.", "Fueling tomorrow's founders").
  - **Center card:** Frosted glass container (`rounded-[30px] border border-white bg-white/95 backdrop-blur-xl shadow-xl`) with the official iPreneur logo, "Create your account" title, and styled icon inputs for Full Name (`User`), Email (`Mail`), and Password (`Lock` + `Eye`/`EyeOff` toggle).
  - **Right column:** `RocketIllustration` component with floating capability cards ("Ideate", "Build", "Scale") and handwritten script ("Start Scale Succeed").
  - **Background:** Ambient gradient circles, curved rings, waves, and subtle grid mesh overlay.
- Preserved `searchParams` support (`prompt` & `format`) so founders redirected from the landing page generator bar keep their input state upon sign-up.

`File: frontend/src/pages/auth/RegisterPage.tsx`

---

### 41. Venture Studio Executive Dashboard — full redesign from Stitch spec

**Context:** A Stitch-generated design package (`stitch_professional_dashboard_redesign.zip`) was provided containing a reference `screen.png`, `DESIGN.md` (typography, color palette, spacing, component specs), and `code.html` (full single-page implementation). The dashboard was rebuilt to match this specification.

**Extracted to:** `stitch_extracted/` — `screen.png`, `DESIGN.md`, `code.html`.

**a) Sidebar navigation (`DashboardLayout.tsx` — full rewrite).**
- Brand logo with `v3.4` version badge.
- **Cohort Switcher:** "Winter 2025 Cohort · 18 portfolio companies" dropdown.
- **Core navigation:** Pitch Control (with active `12` badge), Deck Generator (`⌘N` shortcut), Investor Radar, Telemetry — each with Lucide icons and active-state styling (emerald left border + white text).
- **Preferences section:** Settings, Billing links.
- **Venture Tier quota card:** Animated radial progress gauge showing `847/1000` monthly generations, "Tier 1" badge.
- **Founder profile row:** User initials avatar, name, email, logout button.
- **Executive sticky top header:** Global command search (`⌘K`), "AI Pitch Engine Online" animated pulse indicator, notification bell trigger, "Auto-Scrape URL" button with `Zap` icon, and primary "Create Deck" CTA.
- Search query state is passed to child routes via `<Outlet context={{ searchQuery }}>`.

**b) Dashboard page (`DashboardPage.tsx` — full rewrite).**
- **Global hero banner:** "Demo Day Ready · Winter Cohort Final Stretch" announcement strip with pipeline value (`$4.60M ARR`), export button, and countdown context.
- **4 Advanced KPI cards:** Portfolio Decks (`24`), Pitch Ready Rate (`89%`), Pipeline In Review (`7`), Tracked Deal ARR (`$4.6M`) — each with inline SVG sparkline charts and trend indicators (↑/↓ percentages with green/amber coloring).
- **3-Column interactive deck grid:**
  - Tab bar: All / Ready / Under Review / Drafts with counts.
  - Secondary controls: sort dropdown, search filter (wired to header search), Grid/List toggle.
  - Deck cards with abstract geometric preview headers (unique per-card color schemes using SVG circles/rects/lines), readiness gauge (`96/100 · 14 Slides`), live VC radar status badges ("Live on Radar" green / "Under Review" amber / "Draft" zinc), industry tags, round tags (Series A / Pre-Seed / Seed), view count telemetry, and direct Editor/Workspace links.
  - Interactive "+ New Deck" creation tile with dashed border.
- **Right activity rail (1 column):**
  - *Live VC Telemetry* — real-time investor interaction feed (Sequoia Capital, Andreessen Horowitz, Benchmark, etc.) with action types (Viewed Pitch, Slide Drop-off, Note on TAM, Downloaded Deck), relative timestamps, and colored dot indicators.
  - *Demo Milestones* — countdown card ("14 Days to Demo Day") with 3 milestone checkboxes (Pitch Rehearsal, Investor List Locked, Final Deck Submitted) and progress bar.

**c) Data wiring.**
- Live projects from backend API (`projectsApi.list` via React Query) are merged with demo fallback decks when no real projects exist.
- Search query from header filters deck cards in real-time by name and industry.
- Tab filtering operates on project `status` field.
- All navigation routes preserved: `/dashboard`, `/projects/new`, `/projects/:id/editor`, `/settings`, `/billing`.

**d) Typography & palette (from DESIGN.md).**
- Fonts: `Plus Jakarta Sans` (headings), `Inter` (body), `JetBrains Mono` (metrics/code) — loaded via Google Fonts in Tailwind config.
- Primary dark: `#0a0a0f` (sidebar/backgrounds), accents: emerald `#10b981` / `#059669`, surface cards: `rgba(255,255,255,0.03)` with `backdrop-blur`.
- Glassmorphic cards with `border border-white/5` and subtle hover transitions.

**Verification:** `tsc && vite build` — zero errors, production bundle built cleanly. `DashboardPage` chunk: 30.72 KB (6.29 KB gzipped).

`Files: frontend/src/components/layout/DashboardLayout.tsx, frontend/src/pages/dashboard/DashboardPage.tsx`

---

## Session: 2026-09-22

### 42. Application-Wide Apple Typography Standard

**Objective:** Harmonize typography across the entire application to Apple's native system font stack (`SF Pro` / `-apple-system`).

**Changes:**
- **Tailwind font family configuration (`tailwind.config.js`):**
  - `sans`: `["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"]`
  - `mono`: `["SF Mono", "ui-monospace", "Cascadia Code", "Segoe UI Mono", "Menlo", "Monaco", "Consolas", "monospace"]`
  - `display`: `["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"]`
- Removed external Google Font stylesheet link tags from `index.html` in favor of high-performance native system fonts.
- Standardized `index.css` font-family variables to the Apple font stack with fallback to modern system sans-serif.

`Files: frontend/index.html, frontend/tailwind.config.js, frontend/src/index.css`

---

### 43. Accelerator Executive Dashboard Redesign & Card Interactivity

**Context:** Re-architected the accelerator dashboard layout to match the clean executive reference design and enhanced deck card interactivity.

**a) Sidebar Navigation & App Shell (`DashboardLayout.tsx`):**
- **Brand Identity:** Clean `iPreneur ACCELERATOR` badge header.
- **Workspace Navigation:** Streamlined 5-item menu (`Overview / Decks`, `Pitch Intelligence`, `VC Telemetry`, `Cohort Analytics`, `Settings`) with blue active state accents.
- **Founder Profile & Resource Usage:** Bottom user card with status dot, display name, account tier, storage & deck usage meter (`2 of 3 used`), and upgrade link.
- **Responsive Navigation:** Added mobile sliding drawer navigation and toggle.

**b) Dashboard Layout & Telemetry Rail (`DashboardPage.tsx`):**
- **Executive Cohort Header:** "Demo Day Ready · Winter Cohort Final Stretch" status banner with quick export action.
- **4 Key Performance Indicators:** Cohort Velocity (`24 Active`), Readiness Threshold (`100% Pitch Ready`), Cohort Tracked ARR (`$4.6M +18.4% YoY`), and Institutional VC Reach (`14 VCs · Live Sync`).
- **Deck Grid:** Retained the abstract geometric deck card design per user preference, featuring custom gradient banners, radar status badges with animated ping pulse, readiness score gauge (`/100`), slide counts, domain links, and investor view telemetry.
- **Right Activity Rail:**
  - *Live VC Telemetry:* Real-time partner session activity feed (Sequoia Capital, Lightspeed Venture, Matrix Partners).
  - *Cohort Intelligence Note:* AI-generated insight and investor introduction recommendations.
  - Sticky "+ New Deck" action button.

**c) Card Interactivity:**
- Made each entire deck card directly clickable (`onClick` navigating to `/projects/${deck.id}/editor`) with `cursor-pointer` and hover transitions (`hover:border-blue-200 hover:shadow-md`).
- Added `e.stopPropagation()` to internal elements (domain links, options buttons, and present links) to prevent event conflicts.


---

## Session: 2026-09-25

### 44. Infographic Deck Themes & Compact Sidebar Refinement

**Objective:** Implement full set of 40 themes (including 10 Infographic themes with Donut and World Heatmap covers), add family filtering in template picker, and compact the navigation sidebars.

**a) Infographic Theme Covers & 40 Themes Integration (`TemplatedDeck.tsx`, `themes.ts`, `themes.py`):**
- Added `donut` cover variant: high-precision SVG multi-segment donut chart, center scale badge (`+148% YoY Scale`), callout indicator lines, and frosted KPI metric badges.
- Added `heatmap` cover variant: coordinate matrix world map continent dots, glowing hub nodes (SF, NYC, London, Frankfurt, Tokyo, Singapore, Sydney) with radar ripple rings, interconnecting curved data arcs, live mesh status indicator, and a 4-metric telemetry status bar.
- Expanded `CoverVariant` union with `"donut"` and `"heatmap"`.
- Wired all 4 showcase designs:
  - Top-Left: Radial Dashboard (`pulse` / Data Pulse)
  - Top-Right: Donut Stats (`atlas` / Market Atlas & `cobalt` / Cobalt)
  - Bottom-Left: Global Heatmap (`chrome` / Midnight Chrome)
  - Bottom-Right: Gradient Flow (`flux` / Gradient Flow & `prism` / Prismatic)
- Added family filter tab bar (`All Themes (40)`, `Infographic (10) ✨`, `Volume 2 (10)`, `Studio (10)`, `Classic (10)`) with clear total count in `TemplatedDeckSection.tsx`.

**b) Compact Sidebar & Navigation Menu (`DashboardLayout.tsx`, `DeckWorkspace.tsx`, `WorkspacePage.tsx`):**
- Narrowed the main application sidebar from `w-[220px]` to `w-[176px]`.
- Reduced vertical and horizontal navigation padding (`py-1.5 px-2.5`), tightened icon size (`size={14.5}`), and set compact font sizing (`text-[12px]`).
- Scaled down the user profile badge (`w-7 h-7` avatar, `text-[11.5px]`, `h-1` meter bar).
- Narrowed the slide rail in `DeckWorkspace.tsx` from `232px` to `180px`, giving more canvas area to the slide preview.
- Narrowed workspace branding side panel in `WorkspacePage.tsx` from `300px` to `250px`.

**Verification:**
- `npx tsc --noEmit` passed with 0 errors.
- Vite build passed.

`Files: frontend/src/components/layout/DashboardLayout.tsx, frontend/src/components/workspace/deckTemplates/DeckWorkspace.tsx, frontend/src/components/workspace/deckTemplates/TemplatedDeckSection.tsx, frontend/src/components/workspace/deckTemplates/TemplatedDeck.tsx, frontend/src/components/workspace/deckTemplates/themes.ts, backend/app/ppt/engine/themes.py`

---

### 45. Uiverse Liquid Gradient Pill Button Implementation (`DashboardPage.tsx`, `index.css`)

**Objective:** Implement the Uiverse liquid expanding gradient pill button design for the "+ New Deck" action.

**Changes:**
- Created `.btn-uiverse-fill` in `index.css` adapting the Uiverse button:
  - Full pill border radius (`rounded-full` / `9999px`).
  - Base deep slate surface (`#0f172a`) with white icon and typography.
  - Expanding liquid `::before` pseudo-element with the application's brand gradient: `linear-gradient(to right, #2563EB 0%, #4F46E5 50%, #7C3AED 100%)` (Electric Blue → Indigo → Royal Violet).
  - Hover state: gradient sweeps across 0% to 100% width, text and icon remain vibrant white with subtle glass border, `+` icon rotates 90 degrees with an elastic curve, and ambient indigo/violet glow shadow is cast (`0 6px 24px rgba(79, 70, 229, 0.45)`).
  - Active tactile feedback on click (`scale(0.97)`).
- Applied `.btn-uiverse-fill` to the main header "+ New Deck" button and the dashboard empty-state "+ Create your first deck" button in `DashboardPage.tsx`.

**Verification:**
- `npx tsc --noEmit` passed with 0 errors.

`Files: frontend/src/index.css, frontend/src/pages/dashboard/DashboardPage.tsx`

---

### 46. Uiverse Animated Expanding Logout Button (`DashboardLayout.tsx`, `index.css`)

**Objective:** Implement the Uiverse expanding circle-to-pill animated logout button for the user profile footer.

**Changes:**
- Added `.btn-uiverse-logout` in `index.css`:
  - Circular resting state (`28px × 28px`, `border-radius: 9999px`) with red/coral background (`rgb(239, 68, 68)`) and centered white exit door SVG icon.
  - Hover expansion: expands horizontally to `82px`, smoothly revealing the "Logout" text label.
  - Ambient crimson drop-shadow on hover (`box-shadow: 0 4px 16px rgba(239, 68, 68, 0.45)`).
  - Tactile press feedback on click (`scale(0.96)`).
- Replaced the simple static `LogOut` icon button in `DashboardLayout.tsx` user account section with `.btn-uiverse-logout`.

**Verification:**
- `npx tsc --noEmit` passed with 0 errors.

`Files: frontend/src/index.css, frontend/src/components/layout/DashboardLayout.tsx`

---

### 47. Templates Gallery Page (`/templates`) & Template Pre-selection

**Objective:** Give the sidebar a Templates entry so a user can browse every deck design before committing to one.

**Changes:**
- New `frontend/src/pages/templates/TemplatesPage.tsx` — all 40 templates rendered live from a sample deck, grouped by family (Classic / Studio / Volume 2 / Infographic), with search, family chips, and a 5-slide preview modal (cover, problem/solution, market, traction, team).
- Route `/templates` in `App.tsx`; `LayoutTemplate` NavLink in `DashboardLayout.tsx`.
- "Use this template" navigates to `/projects/new?template=<key>`. `NewProjectPage.tsx` now reads that param, validates the key against `THEMES` (so a stale or hand-typed key is ignored), and applies it after creation via the existing `projectsApi.update(id, { templateKey })` — project *creation* does not accept a template key, so no backend change was needed.

**Bug fixed — thumbnails rendered at 1:1, cropped:**
The thumbnail CSS used `transform: scale(calc(100cqw / 1280))`. `scale()` takes a unitless number and `calc(100cqw / 1280)` evaluates to a *length*, so the browser dropped the declaration entirely — measured `transform: 'none'` in both the grid and the modal. Every thumbnail was a 1:1 crop of the slide's top-left corner. Replaced with a `ResizeObserver` that measures the card and sets a numeric scale.

**Verification:** search ("blue" → 1 card), chips (Infographic → 10, All → 40), CTA lands on `?template=blueprint`; grid, modal and 400px mobile all render with no clipping and no horizontal overflow; `tsc --noEmit`, `npm run build`, backend 402 passed / 1 skipped.

`Files: frontend/src/pages/templates/TemplatesPage.tsx, frontend/src/App.tsx, frontend/src/components/layout/DashboardLayout.tsx, frontend/src/pages/workspace/NewProjectPage.tsx`

---

### 48. DeckWorkspace — Two-Pane Deck Editor

**Objective:** Opening a pitch deck should show the deck: a slide navigator on the left, a scrolling editable canvas on the right, replacing the one-slide-at-a-time carousel.

**Why:** the carousel paged through slides with a row of dots. That stops working at the 20-30 slides the longer deck types now generate — 24 dots is not a navigator.

**Changes:**
- New `DeckWorkspace.tsx`: single toolbar (deck name, deck type + slide count, template picker showing all 40 templates against *this deck's own cover*, Present, and a slot for Discard/Save) over two independently scrolling panes.
- Left rail: every slide as a live thumbnail, numbered, with its section label; `IntersectionObserver` keeps the rail in sync with the canvas, and clicking a thumbnail scrolls the canvas.
- Right canvas: slides stacked vertically, editable in place. One `FloatingTextEditor` per slide, since each slide is its own positioning context on a scrolling canvas.
- `EditorPage.tsx` rewritten to host it; `TemplatedDeckSection` still serves the project overview page.

**Bugs fixed:**
- **Every slide was clipped.** Scale was measured from `clientWidth` on the *padded* stage but rendered into its content box, so each slide was ~64px wider than the wrapper clipping it (this is what shaved the year off the cover's top-right). Ref moved to an inner unpadded element; verified the rendered slide matches its wrapper to **0px at 1500/1280/1024/820/640/430** with zero horizontal scroll.
- **Template popover painted behind the slides.** The toolbar's `backdrop-blur` creates a stacking context, so the popover's `z-40` could not outrank the later panes. Fixed by ranking the toolbar itself (`relative z-30`).
- **Rail buttons announced each slide's entire text** as their accessible name — thumbnail is now `aria-hidden` with an explicit `aria-label`.

**Verification:** on a real 13-slide investor deck from the database — rail/canvas sync both directions, click-to-edit positions correctly, template switching repaints rail and canvas, present mode + Esc, narrow width (rail hides, toolbar wraps, no overflow), no JS errors.

`Files: frontend/src/components/workspace/deckTemplates/DeckWorkspace.tsx, frontend/src/pages/editor/EditorPage.tsx`

---

### 49. Dashboard — Fabricated Metrics Removed

**Objective:** The dashboard should show only real information about the user's pitch decks.

**Removed (none of it derived from any deck):**
- `Cohort Tracked ARR $4.6M` / `+18.4% YoY`, `Institutional VC Reach 14 VCs` / `Live Sync` / `Avg. Deck Dwell Time 3m 42s` — hardcoded strings.
- "**Sequoia Capital** has viewed 3 cohort decks in the last 48 hours" — entirely fabricated, and it named a real firm.
- `100% Index Sync`, `Zero Blockers` — filler sub-lines.
- `SCORE 92/100` on every card — there is no scoring system; `score || 92` meant every real deck showed 92.
- Eye-icon "24 investor views" — no view tracking exists; every deck showed 24.
- `DEMO_DECKS` — five invented startups shown whenever the project list came back empty.
- Share / overflow buttons that both just opened the editor, and "Present" which did not present.

**Replaced with:** Decks (total + distinct deck types), Ready (count + % of decks), In progress, Slides (total + avg per ready deck). Slide counts run through the same content-aware `slideOrder()` resolver the editor renders with, so the card figure equals what opening the deck shows — necessary because only 2 of 9 real decks have a persisted `slide_order`.

**Bug fixed:** the status badge was hardcoded to a green pulsing "Ready" on *every* card — the 1 draft and 2 failed decks all displayed as Ready. Now Ready / Generating / Draft / Failed from real status. Also added the loading skeletons, error state and empty state; `isLoading` had been destructured and discarded.

**Sizing (requested):** heading 28 to 22px, body 13 to 12px, stat numbers 30 to 22px, card padding 20 to 14px, banner 128 to 56px. All 9 decks now fit one screen; previously two decks filled the viewport.

`Files: frontend/src/pages/dashboard/DashboardPage.tsx`

---

### 50. Deck Cards — Live Cover Thumbnails, Status Filters, `FitSlide`

**Objective:** Lead each dashboard card with the deck itself rather than a generic gradient banner.

**Changes:**
- Each card renders its own first slide through `renderSlide` in that deck's own template — not a stored image, so it always reflects current content and template.
- Status filter chips (All / Ready / Drafts / Failed) with counts; a chip only appears for a state the user actually has decks in.
- Grid goes to 5 columns at wide widths (4 / 3 / 2 / 1 as it narrows).
- A status pill is shown **only** on decks that are not ready — a ready deck's own cover says everything, and badging all 30 would be noise. Draft/failed decks get a labelled placeholder instead of a blank tile.
- Meta line shows deck type + real slide count + relative time.

**Refactor:** `FitSlide` extracted to its own module and now shared by the dashboard cards, the editor rail, and the template picker. The same root cause — a fixed scale against a container whose width is decided at layout time — produced three separate visual bugs this session (template thumbnails, canvas slides, picker tiles). It is now measured everywhere.

**Verification at the real page size** (30 live slide renders is the worst case): 30 cards in 1.18s, 21 slides rendered with 9 correct placeholders, 5 columns, filter click repaints in 126ms, no overflow, no JS errors. Thumbnail fit measured: rail 13/13 at **0px** gap; picker 40/40 within 0.34px (sub-pixel grid-track rounding).

`Files: frontend/src/pages/dashboard/DashboardPage.tsx, frontend/src/components/workspace/deckTemplates/FitSlide.tsx, frontend/src/components/workspace/deckTemplates/DeckWorkspace.tsx`

---

### 51. Sidebar — Dead Features Wired Up

**Objective:** The rail was sparse and largely empty. Most of what now fills it was already built but unreachable.

**Dead features found and connected:**
- **Search was entirely dead.** `searchQuery` was held in state and passed to the dashboard, which filters on it — but `setSearchQuery` was never called and no search input existed anywhere in the app. Added one in the rail: typing "razorpay" takes the grid from 9 cards to 1.
- **Ctrl/Cmd+K focused nothing** — it looked for `#global-command-search`, an id that existed nowhere in the codebase. That element now exists and the shortcut focuses it.
- **No sign-out anywhere.** `handleLogout` was defined and never called.
- `/billing` had a route but no nav entry.

**Added:** a Recent list (five most recently touched decks, status dot, routes to editor for ready decks and the status page otherwise); grouped nav (Workspace / Account); a deck composition bar (ready / running / draft / failed segments); brand mark and vertical gradient. New `services/api/billing.ts` — there was no frontend module for `GET /billing/plan`. The sidebar reuses the dashboard's `["projects"]` query key, so it shares one cached response rather than issuing a second request.

**Removed:** hardcoded `Decks 2 of 3` and its two-thirds-full meter.

**Judgement call:** wiring the real `/billing/plan` limit in rendered **"9 / 3"**. Both numbers are real, but `projects_limit` is a *per-month* allowance while the count is every deck ever created — pairing them asserts a relationship that does not exist and reads as "over quota". Dropped the limit and kept the plan name; quota belongs on Billing, which knows the period.

**Verification:** 1500px and 400px — mobile drawer opens/closes, search and Recent work inside it, no horizontal overflow in either state, no JS errors.

`Files: frontend/src/components/layout/DashboardLayout.tsx, frontend/src/services/api/billing.ts`

---

### 52. Session Notes — Corrections & Outstanding

**Correction logged:** a change was made to `components/dashboard/ProjectCard.tsx` to route finished decks to the deck workspace, and reported as a navigation change. `ProjectCard.tsx` is **dead code — nothing imports it**; the dashboard renders its own inline cards which already opened the editor. The edit was reverted.

**Parallel edits merged cleanly:** entries 44-46 (Infographic covers, compact sidebars, Uiverse buttons) were applied to `DashboardPage.tsx` and `DashboardLayout.tsx` alongside the rewrites above. Current state verified to hold both: `.btn-uiverse-fill` (2 uses) and `.btn-uiverse-logout` (1 use) are intact, `RAIL_W = 180`, sidebar `w-[212px]`, `tsc --noEmit` clean.

**Still outstanding:**
- **Nothing in this session has been committed.**
- `NewSidebarLeafGraphic.tsx` (288-line decorative SVG) remains unused — drawn 265px wide for a 212px rail, and positioned where the Recent list now sits.
- The landing page's template gallery still passes a template *title* to `/register`, which nothing reads — Phase C's registry-backed rebuild.
- Backend PPTX fallback in `presentations.py` still renders Studio / Volume 2 / Infographic templates as Meridian (accepted under "React only").
- Paused parameters plan: Phase 2 (profile UI + AI pre-fill), Phase 4 (selection engine), Phase 5 (evidence layer + dynamic Appendix).
- PROJECT_LOG #30 still stands: real credentials remain in git history at `e346ba6` and should be rotated.
