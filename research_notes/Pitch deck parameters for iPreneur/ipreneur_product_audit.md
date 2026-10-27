# iPreneur (marketed as "Mint"): product audit of the pitch-deck parameters the codebase encodes

Scope: the local repo `C:\puneeth\pitch git\ipreneur` as of 2026-10-27 (branch `main`, HEAD `bcff6c5`, with 26 modified and several untracked files). This is a codebase audit. Every "source" is a file and line range, not a URL. Path abbreviations: `BE/` = `ipreneur/backend/app/`, `FE/` = `ipreneur/frontend/src/`, `DT/` = `FE/components/workspace/deckTemplates/`. **[uncommitted]** marks working-tree changes that are not in HEAD, and **[untracked]** marks files git has never seen. Cited Findings contain only what the code was observed to do. Interpretation goes under Inferences.

## 1. What is the end-to-end user flow, and which agents exist?

### Takeaway
The live path is one `MasterDeckAgent` that makes two Gemini calls. The first is a web-grounded research pass. The second is a single JSON generation pass that writes the whole deck twice: a legacy `slides[]` array plus a richer `template_data`. After that, a deterministic, advisory-only claims auditor runs **[untracked/uncommitted]**, then a server-side PPTX render. The older multi-agent pipeline (Research, Analysis and Content agents) is still in the repo and still mounted at `/api/v1/pipeline/generate`, but project generation does not use it.

### Cited Findings
**Flow, step by step**
- The landing hero's prompt box navigates to `/register?prompt=<text>`, or to "Build a {preset} deck" for presets — [FE/components/landing/HeroSection.tsx:22-30]
- The new-project form's deck-type picker is driven by `GET /api/v1/deck-types`. That endpoint serializes the registry: label, slide_count, research profile, manual_required, brief_fields and parameter_groups — [BE/decks/registry.py:647-677], [BE/decks/registry.py:28-41]
- The category tabs on the picker are **[uncommitted]**: Fundraising (investor, update, demoday, elevator), Sales & Clients (sales, partnership), Product (product), Internal (internal, vision), Strategy (general, gtm, business, master). `appendix` is in no category, so it only appears under "All" — [FE/pages/workspace/NewProjectPage.tsx:181-187, 382-383, 607]
- Intake fields on the form:
  - **Inputs:** a website URL, or a manual path with company_name, problem_statement, solution_description, target_customer, traction_notes, competitor_notes, and founders[name, role, one-liner].
  - **Stage select:** idea, pre_revenue, pre_seed, seed, series_a, series_b, growth, bootstrapped [NewProjectPage.tsx:869-877].
  - **Business-model select:** saas, marketplace, services, ecommerce, fintech, hardware, other [:886-893].
  - **Format:** presenter or standalone [:38, :902-909].
  - **Numbers:** ARR (USD), MRR (USD), total customers, MAU, ask amount (USD), round, founded year, team size, MoM growth %, monthly churn %, CAC (USD), LTV (USD), NRR % [:935-958].
  - **Per-type brief fields:** for example, sales asks for target_buyer, buyer_pain, case_studies and pricing_notes — [BE/decks/registry.py:128-139]
- A project can attach a persistent **Company Profile** (924 parameters in 49 groups). It is rendered into the prompt, filtered to the deck type, and also drives the dynamic Appendix — [BE/api/v1/endpoints/projects.py:77-106], [BE/profile/prompt.py:66-117]
- `POST /projects/{id}/analyze` is rate limited to 20/hour per IP ("a spend ceiling as much as an abuse control"). It spawns a daemon thread that runs `_run_analysis_inline` — [BE/core/ratelimit.py:32-34], [BE/api/v1/endpoints/projects.py:535-573]
- Pipeline steps:
  1. Resolve the sections from deck type, stage and profile fill [projects.py:101-106].
  2. Crawl the website with Playwright (default max 18 pages, [BE/core/config.py:125]), or skip the crawl when there is no site [projects.py:108-128].
  3. Run `MasterDeckAgent.generate` [:130-157].
  4. Fetch the logo and the founder-uploaded gallery images [:183-199].
  5. Render the PPTX with `PPTRenderer`. The theme is the user's pick, otherwise the AI's `theme_suggestion` [:203-218].
  6. Upload, persist deck_content and research_data, and create a Presentation row [:220-260].
  
  Job progress reports 0 → 25 → 75 → 80 → 95%.
- The pipeline docstring says "one Gemini call does everything" [projects.py:40]. The agent actually makes two passes, plus an optional third team search (see below).

**Agents**
- **MasterDeckAgent (live)** — [BE/agents/master/master_agent.py:1-11, 192-212]
  - **Two keys:** Pass 1 uses `effective_research_model` with Google Search grounding on API key 2. Pass 2 uses `gemini_model` on key 1.
  - **Research profile per deck type** [:416-439, :642-687]:
    - `full`: founders, company facts, funding, competitors, market.
    - `light`: competitors and market only.
    - `none`: no web research at all.
  - **Team search:** a targeted third call runs when `full` research finds no founders [:482-492, :541-569].
  - **Founder override:** founders typed into the form replace web-found people and are tagged `source:"founder-provided"`, `confidence:"HIGH"` [:251-265].
  - **Retries:** generation retries four times on 429/5xx (5, 10, 15 s backoff). On `MAX_TOKENS` it raises `DeckTruncatedError` and retries once with a "compact" prompt (research JSON cut to 3,000 chars, worked examples dropped) [:286-334, :874, :892].
  - **Validation:** pydantic validates the output per section and truncates lists to their caps [:374-382]; [BE/ppt/engine/template_schema.py ~60-62]
- **Claims auditor [untracked dir `BE/agents/audit/`]** — "deterministic on purpose… Findings are advisory… never blocks or rewrites" [BE/agents/audit/claims_auditor.py:1-15]. It is called after validation, and its result is merged into `research_summary["audit"]` [master_agent.py:384-400, uncommitted]
- **Legacy agents (not on the project path)**
  - `ResearchAgent` v4: seven parallel DuckDuckGo searches plus page fetches, on Gemini key 2 [BE/agents/research/research_agent.py:1-16].
  - `AnalysisAgent` v2: positioning, ICP, moat, conservative/base/optimistic revenue scenarios, SWOT, GTM, an "investor attractiveness score 1-10", risks, and per-field confidence percentages [BE/agents/analysis/analysis_agent.py:1-20].
  - `ContentGenerationAgent` v3: a fixed 11-slide (docstring) or 14-slide (worker) deck [BE/agents/content/content_agent.py:1-17], [BE/workers/tasks/analysis.py:8-10].
  - All three are reachable through `POST /api/v1/pipeline/generate` [BE/api/v1/endpoints/pipeline.py:1-8, 25-26; mounted at BE/api/v1/routes/__init__.py:31] and the Celery task [BE/workers/tasks/analysis.py:107-109, 181-197]. The live project path reuses only the `DeckContent`/`SlideContent` dataclasses [projects.py:161-178].
- **Editor and export**
  - Text is edited in place on the slide [DT/editing/FloatingTextEditor.tsx], and any of the 40 themes can be applied to a finished deck.
  - A research panel shows HIGH/MEDIUM/LOW badges on the overall research, each founder and each competitor, plus the source list [FE/components/workspace/ResearchSourcesPanel.tsx:25-33, 73, 93, 115, 159].
  - Two exports exist. The server PPTX download [BE/api/v1/endpoints/presentations.py:52-53] has native text, tables and charts per the landing copy [FE/pages/LandingPage.tsx:121]. The client export rasterises each slide with html-to-image and places the images in PptxGenJS [DT/exportDeck.ts:16-17, 106-127].
  - The landing page itself lists three things it does not do: no PDF export, no share link, no view tracking [LandingPage.tsx:451-453].

### Inferences
- Functionally there is one prompt-driven generator. There is no critique-and-revise loop: the auditor's findings are stored but never fed back into generation.
- `POST /pipeline/generate` declares no `get_current_user` dependency [pipeline.py:25-26], and the router is mounted without one [routes/__init__.py:31]. It appears to be an unauthenticated endpoint that triggers a crawl and paid Gemini calls. This is inferred: no global auth middleware was checked.

### Gaps
- `BE/ppt/engine/renderer.py` was not read in full, so how faithfully the PPTX renders each section was not verified. PROJECT_LOG says proof/persona/gallery previously rendered empty in PPTX and were fixed in "Phase 0" [ipreneur/PROJECT_LOG.md:742-760].
- The Company Profile CRUD and AI pre-fill (`BE/api/v1/endpoints/profiles.py`) were not traced.

## 2. Which deck sections are generated, with what fields, in what order, and how many slides?

### Takeaway
The catalogue holds 45 content section keys plus 20 Appendix "evidence" keys (65 specs). All of them are drawn by only 16 renderers, and **every section is exactly one slide**. The 14 deck types run from 5 to 25 slides; the Appendix is dynamic at 4–22. The Investor deck is 24 slides, or 22 for the idea and pre-revenue stages. **Only 5 of 14 deck types meet the team's 20–30 slide target** (investor, general, gtm, business, master).

### Cited Findings
- Each section key maps to a pydantic model, renderer, legacy layout, one-line prompt, JSON skeleton, list caps and an optional rules block — [BE/decks/sections.py:1-22, 249-263]
- One slide per section:
  - The slide plan prints one line per key [BE/decks/prompt.py:97-106].
  - The slides skeleton says "one object per slide in the plan above, {N} in total, in that exact order" [prompt.py:165].
  - The prompt demands "produce EXACTLY these {N} slides, in this order" [master_agent.py:964-967].
- The 16 renderers are cover, summary, probsol, product, market, model, traction, competition, roadmap, gallery, team, ask, closing, proof, persona, vision — [DT/deckTypes.ts:21-24]. Sections reuse renderers deliberately ("risks renders through the same two-column renderer as probsol…") [sections.py:12-16].
- Every theme renders every section. Themes are token sets over the same renderers, and every layout token falls back to the original literal ("adding a token must never move an existing deck") — [DT/themes.ts:1-15, 376-389]

**Slide count per deck type** (computed by importing `BE/decks/registry.py`; sequences are at registry.py:71-447)

| Deck type | Slides | Research | Stage overrides |
|---|---|---|---|
| investor | 24 | full | idea/pre_revenue → 22 |
| sales | 14 | light | — |
| product | 14 | light | — |
| partnership | 15 | full | — |
| internal | 10 | none | — |
| update | 8 | none | — |
| vision | 8 | full | — |
| general | 20 | full | — |
| elevator | 5 | light | — |
| demoday | 10 | full | idea/pre_revenue → 10 (traction swapped for vision) |
| gtm | 22 | full | — |
| business | 24 | full | — |
| master | 25 | full | — |
| appendix | 8 by default, up to 22 | light | dynamic from profile data |

- The landing FAQ quotes "Elevator is five slides, Demo Day is ten, Investor is twenty-four, and the Master deck runs to twenty-five" [FE/pages/LandingPage.tsx:117]. That matches the registry.
- The `general` type's goal says "make the company understandable and credible in twelve slides" [registry.py:302], but the type declares 20 sections [registry.py:304-308].

**Investor deck (default) — 24 slides, in order** [registry.py:71-75]. Fields and caps come from sections.py. Each list is capped and truncated to its cap.

| # | Key | Slide label | Renderer | Fields / required content | Key rules (sections.py) |
|---|---|---|---|---|---|
| 1 | cover | Cover | cover | company, mark, tagline, eyebrow, year, round, theme_suggestion | passthrough keys [:868]; [prompt.py:123-129] |
| 2 | summary | Executive Summary | summary | headline (thesis), lead (2 sentences), highlights ≤4 {k,l}; example ARR/Customers/Market CAGR/TAM | [:290-295] |
| 3 | story | Our Story | summary | origin headline, lead, 4 markers (Founded/Founders/Team/Markets) | "earns its slide only if it explains founder-market fit" [:690-696] |
| 4 | probsol | Problem & Solution | probsol | problem[3]{k,t}, solution[3], leads, foots ("cost of inaction"/"payoff") | exactly 3 each [:297-306] |
| 5 | persona | User & Job to Be Done | persona | who, context, jobs[3], pains[3], quote | who must name a specific role and company profile [:428-438] |
| 6 | product | Product | product | 3 numbered steps {n,t,d,tags 2-3} | [:308-314] |
| 7 | galleryS | Gallery | gallery | 5 image placeholders {id, ph caption, span on slots 1 and 5} | [:361-370] |
| 8 | techIp | Technology & IP | product | 3 components "hard to rebuild" | "Only claim patents… actually evidenced" [:698-707] |
| 9 | market | Market Opportunity | market | tam/sam/som {v,l}, note ("bottom-up methodology") | _MARKET_RULES [:266-278, 316-322] |
| 10 | segmentation | Customer Segments | competition | boolean matrix: beachhead vs 3 segments × ≤6 criteria | cols[0] = beachhead [:593-602] |
| 11 | model | Business Model | model | flow 3-4 nodes, streams ≤3 {t,d,v,vl}, tiers ≤3 {t,p,s,d} | [:324-330] |
| 12 | traction | Traction | traction | sub "ARR growth ($M)", series ≤8 {y, v numbers in $M, ascending}, kpis 4 (ARR, MoM growth, Customers, NRR) | "founder-provided figures exactly" [:332-338] |
| 13 | proof | Proof & Case Studies | proof | cases 2-3 {c, m metric, ml, d before→after, q quote}, logos ≤6 | return [] if none [:400-412] |
| 14 | unitEconomics | Unit Economics | traction | payback curve (may go negative) + LTV:CAC, CAC payback, gross margin, NRR | return kpis:[] if none supplied [:640-651] |
| 15 | competition | Competitive Landscape | competition | cols ≤4 (this company + 3 named), rows ≤6 {f, v[bool]} | "This company (index 0) should win most rows" [:340-351] |
| 16 | moat | Moat & Defensibility | probsol | "What a rival faces" vs "What compounds for us" | "Features are not moats" [:721-731] |
| 17 | gtm | **Go-to-Market Together** | roadmap | 4 phases "Phase N · Qn" | "Each phase names the joint activity and which side owns it" [:465-471] |
| 18 | financials | Financials | traction | revenue series (example FY24–FY27) + FY revenue, gross margin, monthly burn, runway | "Never present a projection as though it were history" [:669-679] |
| 19 | roadmap | Roadmap | roadmap | 4 items {q, t, d} | labels exactly 'Q1'..'Q4', no year [:353-359, uncommitted] |
| 20 | risks | Risks & Mitigations | probsol | 3 risks paired with 3 mitigations | "Name real risks with teeth" [:497-507] |
| 21 | team | Team | team | members ≤4 {i initials, n, r, b}, advisors | ONLY research_data.founders; fallback "Leadership / Details available on request" [:372-382] |
| 22 | ask | The Ask | ask | headline (skeleton "Raising $XM Series A"), sub, use ≤4 {l, p} | p totals 100 [:384-390] |
| 23 | capTable | Cap Table | ask | ownership ≤4 {l, p} | founder-supplied only, else [] [:733-743] |
| 24 | closing | Closing | closing | headline, sub, contact email, site | [:392-397] |

- The idea and pre-revenue override drops traction, unitEconomics and financials and adds `vision` (headline, sub, statement, horizon, proofPoints ≤3) — [registry.py:77-84, 101-104], [sections.py:537-547]
- **Non-investor section keys** [sections.py:399-755]:
  - roi: buyer payback, traction renderer.
  - partnerRole, partnershipModel.
  - recommendation (decision memo), options (must include "Do nothing").
  - period (every highlight carries direction, e.g. "+18% MoM"), wins (Wins / Challenges / How you can help).
  - values, pillars.
  - positioning ("name the segment this is NOT for"), messaging.
  - acquisition (real motions such as outbound, content, partner-led, PLG), channels.
  - funnel (Lead→MQL→SQL→Opp→Won rates), distribution, scalePlan, salesMotion (exit criteria per stage).
  - operations (in-house vs outsourced), security ("NEVER claim a certification… not evidenced"), partnerships ("An LOI is not a contract").
- **Appendix evidence sections A1–A20** [sections.py:784-845]. Each is a view onto an existing renderer, included only if the matching profile groups have data:
  - A1 Market Sizing Workings, A2 Customer Research, A3 Competitive Analysis, A4 Product Details, A5 Technical Architecture.
  - A6 Security & Compliance, A7 Traction Details, A8 Cohorts & Retention, A9 Unit Economics, A10 Sales Funnel.
  - A11 GTM Performance, A12 Financial Statements, A13 Financial Forecast, A14 Fundraising, A15 Cap Table.
  - A16 Legal & IP, A17 Customer Proof, A18 Partnerships, A19 Detailed Roadmap, A20 Sources & Evidence.
  - The default set without a profile is evMarket, evCompetitive, evProduct, evTraction, evRoadmap, evSources [:849-851].
  - The cap is `MAX_APPENDIX_SLIDES = 24` [registry.py:514-538]. All of this is **[uncommitted]**.
- **Section keys absent from the catalogue** (checked against all 45 keys in SECTION_SPECS): there is no dedicated "Why Now", "Milestones achieved to date", "Exit / comparables / M&A landscape", "Valuation & terms", "Pipeline", or "Customer testimonials" separate from proof. `positioning` exists but is not in the investor sequence [registry.py:71-75].

### Inferences
- Slide 17 of the investor deck is a partnership slide. `gtm` is the partnership deck's "Go-to-Market Together" section, with its "joint activity and which side owns it" rule and a frontend eyebrow of "Go-to-market together" [DT/deckTypes.ts:61]. The same key is reused in the investor, early-stage, general, business and master decks [registry.py:74, 82, 306, 389, 412]. So the investor deck's go-to-market slide is prompted as a joint launch plan with a partner, which looks like a key-reuse bug.
- Of the 14 types, 9 fall below the 20-slide floor (sales, product, partnership, internal, update, vision, elevator, demoday, and the default appendix). If the target is meant literally for every deck type, the registry violates it.
- Investor slides that are mostly visual or placeholder (galleryS) or that are partnership-shaped (gtm) displace standard investor content such as why-now, milestones and use-of-funds milestones.

### Gaps
- No test or generated example of a full 24-slide investor deck was found, so real output length and quality could not be checked. The only sample output comes from the legacy path (see Q6).

## 3. What do the LLM prompts instruct about content quality?

### Takeaway
The generation prompt is strongly anti-fabrication for people, customers, quotes, certifications, IP and cap table. It enforces "numbers over adjectives" and a "specificity rule". However, it explicitly **allows and even requires** the model to estimate market sizes and competitors from industry knowledge, and it labels any non-empty research as "HIGH CONFIDENCE".

### Cited Findings
**General rules, quoted verbatim** [master_agent.py:986-995]
- "Every bullet must have a bold lead-in"
- "Use founder-provided figures exactly — never round, inflate, or extrapolate them"
- "NEVER write "Not publicly disclosed", "Evolving Landscape", "Available upon request" or any empty filler"
- "⛔ NEVER invent people's names, titles, bios, customers, logos, or quotes. An honest gap beats a fabricated fact. Competitors and market size MAY be reasoned from the industry."
- "Numbers over adjectives: prefer "$47B market growing 40% CAGR" over "a large and growing market""

**Specificity rule, quoted** [master_agent.py:972-984]: "Could I paste this sentence into a rival company's deck in this same industry without changing a word?' If yes, REWRITE IT… Generic industry-truism sentences… are FORBIDDEN even as filler." It comes with before/after worked examples, one of them about India quick-commerce (RedSeer) [:892-906].

**Market (TAM/SAM/SOM)** — `_MARKET_RULES`, quoted [sections.py:266-278]:
- "Every figure must be a specific number, never blank and never "not disclosed". If research is empty, estimate realistically from the industry -- every industry has published reports. MUST be industry + domain + geography specific"
- The legacy `slides[]` also requires "data_points -- EXACTLY 4: TAM, SAM, SOM, Market CAGR" with a source sublabel, plus "exactly 3 yearly projections computed from the founder's MRR/ARR and growth rate (Year N MRR = X * (1+G)^(12N))".
- The section prompt says "TAM / SAM / SOM with a bottom-up methodology note" [:318].
- The research prompt asks for "TAM / SAM / SOM with source names, CAGR with source+period, 3 current growth drivers" [master_agent.py:685-687]. Its example SOM is "~10% SAM capture by 2027" [:774].

**Competition**
- "Use real, named competitors — derive them from the industry if research is empty. NEVER write "Not publicly disclosed" as a competitor name." and "This company (index 0) should win most rows." [sections.py:345-350]
- The research pass wants "at least 3 (industry reasoning is OK here)… name, funding/valuation, one specific weakness" [master_agent.py:679-683]

**Financials**
- "Forecast years must follow from the founder's actual figures and stated growth rate — state the assumption in sub. Never present a projection as though it were history" [sections.py:674-678]
- Founder financials are injected as "ground truth — use exactly": ARR, MRR, customers, MAU, raise, stage, MoM growth, founded, team size, CAC, LTV, a derived LTV:CAC, churn, NRR, round [master_agent.py:803-855, 929-930]

**Ask and use of funds**
- "ask.use[].p are percentages that total 100." The skeleton headline is "Raising $XM Series A", with an example split of Engineering 45 / GTM 30 / Ops 15 / G&A 10 [sections.py:384-390]
- For the partnership deck, "The ask slide here is the partnership commitment being requested, not a raise" [registry.py:190]
- For the internal deck, "The ask slide is budget and headcount, not investment" [registry.py:215-216]

**Team**
- "include ONLY real people from research_data.founders. ⛔ NEVER invent names/titles/bios… If research_data.founders is empty → members:[{"i":"","n":"Leadership","r":"Team","b":"Details available on request"}]" [sections.py:378-380]
- Research: "include a person ONLY if you actually found them via search or the website. If you cannot find ANY real names, return "founders": []" [master_agent.py:667-668]

**Traction and unit economics**
- "traction.series[].v are NUMBERS in $M (no "$"/"M"), ascending" [sections.py:337]
- Unit economics: "Use the founder's CAC/LTV/margin exactly where supplied and derive the rest… If no unit economics were provided, return kpis:[] rather than inventing a ratio" [:646-649]
- Proof: "a fabricated reference is the single most damaging thing a sales deck can contain" [:409-410]

**Claims**
- "NEVER claim a certification (SOC 2, ISO 27001, HIPAA, GDPR) that was not evidenced" [sections.py:715-717]
- "A fabricated patent is a diligence failure" [:704-705]
- "an invented cap table is a legal misstatement" [:739-741]
- "Features are not moats. Real ones: proprietary data, network effects, switching costs, regulatory position, distribution locks" [:727-729]

**Confidence scores**
- The research prompt asks for "Confidence: HIGH = found via search/website, MEDIUM = reasoned from industry, LOW = weak guess" at the top level and per founder and competitor [master_agent.py:753, 757, 697, 764]
- The generation prompt headers the whole research block "(HIGH CONFIDENCE — use this directly)" whenever any founders, competitors or market data exist [master_agent.py:875, 883-886]

**Investor deck type guidance, quoted** [registry.py:96-100]: "Investors read for pattern and risk. Lead with the strongest verifiable fact. Numbers beat adjectives everywhere. Never soften a weakness into vagueness — an honest gap is survivable, a discovered exaggeration is not." Audience: "professional investors evaluating this as one of hundreds of deals this quarter". Goal: "earn a second meeting by proving the market is large, the wedge is real, and this team can execute" [:91-92].

**Format modifiers** [registry.py:488-501]
- Presenter: "Keep on-slide text minimal… ONE idea… Put the supporting detail… into speaker_notes."
- Standalone: "Every slide must be fully self-explanatory… Fuller body copy is correct here."

**Date rules [uncommitted]**: today's date is injected, roadmap phases are labelled "Q1".."Q4" without a year, and past events must be "dated at or before today" [prompt.py:61-69, 47-58].

**Brand colours**: an industry colour guide (AI/LLM indigo+cyan, Fintech deep blue+emerald, SaaS violet+amber, etc.) [master_agent.py:943-962].

### Inferences
- There is a built-in tension. The prompt forbids fabricating people and customers but mandates a "specific number, never blank" for TAM/SAM/SOM even with no research. Market figures are therefore the most likely place for unsourced, plausible-looking numbers. The `template_data.market` model has no source field (`MarketPoint` is just `v`, `l` [sections.py:87-97]); a source only reaches the legacy `slides[]` sublabel and the free-text `note`.
- The projection formula compounds the MoM growth rate over 12N months. At the form's own example growth rates, that produces very large multipliers, and it contradicts the "never… extrapolate" rule. These projections are attached to the market slide's legacy `slides[]` entry, not to the financials slide.
- The empty-team fallback text "Details available on request" collides with the banned filler "Available upon request".
- Skeleton example values (for example "$2.4M ARR", "500+ Customers", "120% Net retention", "$48B TAM", the 45/30/15/10 split, "Raising $XM Series A") sit in the prompt as templates. Only ARR, MRR and revenue tiles are cross-checked by the auditor, so copied example values in other fields would pass.

### Gaps
- No evaluation set or golden outputs were found that measure whether the model actually follows these rules.

## 4. Does the product differentiate by stage, sector, geography or audience?

### Takeaway
Differentiation is mainly by **deck type**: 14 types, each with its own audience, goal, guidance and slide list. Stage handling is thin. Only the investor and demoday decks change slides, and only for idea and pre-revenue. Stage emphasis text is injected for the investor deck only. Sector affects nothing but research queries, colours and theme mood. There is no geography or currency handling: inputs are USD-only, yet the prompt examples are India-centric. Investor audiences are not split into angel, VC, accelerator or corporate VC.

### Cited Findings
**Stage**
- There are 8 stages in the form [NewProjectPage.tsx:869-877].
- `STAGE_EMPHASIS` defines a text block per stage [registry.py:451-485], quoted:
  - Pre-seed: "investors are buying the team and the insight"
  - Seed: "early product-market-fit evidence — retention, usage depth… first repeatable acquisition channel" (the retention sentence is [uncommitted])
  - Series A: "repeatability… unit economics, CAC payback, cohort retention"
  - Series B: "NRR, margin structure, competitive moat"
  - Growth: "durable margins, market share… line to profitability or exit"
  - Bootstrapped: "capital efficiency IS the story"
- The emphasis is applied only when the deck type is `investor`: `emphasis = stage_emphasis(stage) if dt.key == "investor" else ""` [prompt.py:89].
- Slide lists change by stage only for investor and demoday, and only for idea and pre_revenue [registry.py:101-104, 352-355]. Pre-seed through growth all get the identical 24-slide investor deck, including unitEconomics, financials and capTable.
- The profile relevance engine treats `pre_seed` as pre-revenue: `PRE_REVENUE_STAGES = {"idea", "pre_revenue", "pre_seed"}` [BE/profile/relevance.py:191]. Pre-revenue demotes revenue groups from Required to Conditional and promotes validation groups to Required [:212-218].
- The auditor's stage check covers only `("idea", "pre_revenue")` [claims_auditor.py:168-172].

**Sector**
- The industry is a free-text field.
- The business-model select (saas, marketplace, services, ecommerce, fintech, hardware, other) flows only into branding fields [master_agent.py:345-355]. No section, metric or prompt rule branches on business model.
- Industry is used in research search queries [master_agent.py:730], the colour guide [:951-959] and `theme_suggestion`.
- Theme "moods" carry sector labels such as "Classic VC", "Deep tech", "Modern SaaS" and "Fintech light" [DT/themes.ts:73-82].
- The landing images `template_fintech/ai_saas/enterprise/deeptech.jpg` decorate deck-type groups only [LandingPage.tsx:77-98].
- The profile has an `ai_ml_conditional` group (17 params) that is just a Conditional group for some deck types, with no trigger logic [relevance.py:120].

**Geography and currency**
- All monetary intake fields are USD [NewProjectPage.tsx:935-956].
- Profile currency values are formatted with "$" [BE/profile/prompt.py:43-46].
- The auditor parses "$" with k/m/b/bn/t suffixes only, not ₹, crore or lakh [claims_auditor.py:24, 37-50].
- Research prompt examples are India-centric:
  - Competitors: "Quick commerce → Blinkit, Zepto… EdTech India → BYJU'S… Fintech payments → Razorpay, PayU, Cashfree" [master_agent.py:681-683].
  - Schema samples: "IIT Bombay", "Ex-Google India PM", "Bengaluru, India", "Sequoia India" [:693-711].
  - Market sample: "RedSeer", "India urban grocery delivery" [:767-779].
- The market rule demands geography-specific figures [sections.py:269]. The main intake form has no country or geography field; the profile does have headquarters, geographic_market, target_geography and a 10-parameter geographic_expansion group [BE/profile/parameters.py].

**Audience**
- Each deck type declares `audience` and `goal` strings that are injected into the prompt [registry.py:44-66; prompt.py:80-87].
- Investor: "angels or VCs" in the description [registry.py:90], with no split in behaviour.
- Demo Day: "a demo-day audience watching twenty pitches in a row" — "Short declarative headlines, one number per slide, no dense tables" [:340-350].
- Update: "existing investors… need signal, not persuasion" [:241-252].
- Elevator: "someone giving this ninety seconds" [:322].

### Inferences
- Stage is applied inconsistently across three subsystems. The registry overrides two stages, the prompt adds emphasis for investor only, and the relevance engine counts pre-seed as pre-revenue. A pre-seed founder can be told not to supply revenue and still receive a traction slide, a unit-economics slide and a financials slide.
- Because of the "Raising $XM Series A" skeleton, any stage may drift toward Series A framing unless the founder fills `ask_amount_usd` and `round_type`.
- Sector-specific investor metrics are absent: marketplace GMV and take rate, fintech TPV, deeptech TRL or regulatory path, hardware BOM margins. The fixed KPI skeletons are SaaS-shaped (ARR, MoM, NRR, LTV:CAC).

### Gaps
- `BE/profile/relevance.py:73-185` (per-deck R/C/O tables) was only partly read. Only the investor row and the stage rules were verified.

## 5. Which deck templates exist, and what design rules do they enforce?

### Takeaway
There are 40 visual themes in four families: Classic, Studio, Volume 2 and Infographic. All of them render the same 16 renderers on a fixed 1280×720 canvas through optional layout tokens, so every theme renders every section. The design rules are tokens for colour, display and body fonts, density, card style, cover variant, TAM/SAM/SOM figure style and chrome. There are no sector templates and no content-density limits beyond the per-section list caps.

### Cited Findings
- **Theme schema** [DT/themes.ts:36-65]:
  - Required: `mode` (dark/light), `bg`, `surface`, `text`, `muted`, `accent`, `accent2`, `fontD` (display), `fontB` (body), `upper` (uppercase eyebrows), `serif`.
  - Optional layout tokens: `mono`, `radius` (default 18), `cards` (filled/outline/none), `cover` (18 variants), `chrome` (footer/rule/corner/dot/none), `figure` (TAM/SAM/SOM drawn as rings/rows/bars/blocks/table), `ornament`, `density` (airy/normal/tight), `h1` size, `coverSize` (default 96).
- **Families**:
  - Classic, 10 recolours of one composition: meridian (Meridian Navy, "Classic VC", Space Grotesk/Inter), onyx, abyss ("Deep tech"), nocturne ("Modern SaaS"), forest, verdant ("Fintech light"), indigo, editorial (Newsreader serif), terra, slate [themes.ts:72-83].
  - Studio, 10 compositions: broadsheet, monolith, blueprint, aperture, ledger, atrium, strata, kiosk, vellum, circuit [:87-168].
  - Volume 2, from `pitch-deck-designs.zip` with tokens only, "The pack's own HTML is NOT used" (537 hardcoded widths, nowrap, clipping): swiss, gazette, billboard, bento, boardroom, console, aurora, drafting, noir, panelled [:171-262].
  - Infographic: pulse, flux, cobalt, amber, chrome, atlas, prism, sage, crimson, rosegold, with radial, gradient, donut and heatmap covers that read `summary.highlights` [:264-366].
  - `THEMES` concatenates all 40; the default is `meridian` [:368-374].
- **Density** sets slide padding: tight 48/64/78, normal 62/80/88, airy 70/92/92 px [themes.ts:392-398]. Fonts load from Google Fonts on demand [:424-463].
- **Charts**:
  - The traction, roi, unitEconomics and financials renderers draw an SVG area chart from `series` [DT/TemplatedDeck.tsx:118-130, 1000].
  - The competition matrix uses check and cross glyphs [:147-148].
  - The landing page claims a "Real vector chart in PowerPoint (.pptx)" [HeroSection.tsx:253].
- **AI theme choice**: the generation prompt lets the AI pick only among the 10 Classic keys: "theme_suggestion": "one of: meridian, onyx, abyss, nocturne, forest, verdant, indigo, editorial, terra, slate" [prompt.py:129].
- **Templates page** [uncommitted changes]: four family filters, with thumbnails rendered from sample companies (Veyra, Fathom Robotics, Larkspur, Cobalt Analytics, Driftline, Hearthwood, Quillpoint, Marrow Health) [FE/pages/templates/TemplatesPage.tsx:32-35; DT/sampleDeck.ts:13-19, 291-302].
- **Content density limits** are list caps per section: highlights 4, problem/solution 3 each, product steps 3, competitors 3 plus self, rows 6, team 4, use-of-funds 4, series 8 [sections.py:283-755].

### Inferences
- The memory rule "every template must render every section" holds by construction, since themes are tokens over shared renderers.
- Thirty of the 40 themes can never be the AI's default pick.

### Gaps
- `TemplatedDeck.tsx` (1,437 lines) was not read in full, so text-overflow and fit rules (beyond `FitSlide.tsx`) were not audited.

## 6. How do research and fact-checking work, and which models are used?

### Takeaway
Fact-grounding has three layers:
- **Search grounding**: Gemini with the Google Search tool, plus per-item HIGH/MEDIUM/LOW confidence.
- **Ground-truth injection**: founder fields and the provenance-tagged Company Profile.
- **Deterministic claims auditor** [new, untracked]: 11 checks, a 0–100 score, advisory only, and not surfaced in the UI.

Both passes run `gemini-3.8-flash`. The checked-in sample output, `pipeline_output.json`, comes from the legacy path and is a degraded fallback, not a real deck.

### Cited Findings
- **Models**:
  - `GEMINI_MODEL=gemini-3.8-flash`, `GEMINI_MODEL_RESEARCH=gemini-3.8-flash`, `GEMINI_MAX_TOKENS=32768`, `GEMINI_THINKING_BUDGET=2048` [ipreneur/backend/.env.example:28-31; ipreneur/backend/env.cloudrun.yaml:11-14].
  - Code defaults are 16384 tokens and thinking 0 [BE/core/config.py:60-61]. The research model falls back to the generation model [config.py:95-104].
  - Commit `94db209` moved off the retired gemini-2.5-flash, but the docstring still says "gemini-2.5-flash" [master_agent.py:426].
  - `.env.example:35` sets `ANTHROPIC_MODEL=claude-sonnet-4-20250514`, but no Python file references anthropic (grep found no hits).
  - Gemini is called over REST with `tools: [{"google_search": {}}]` when `use_search=True`, and `thinkingBudget` is set explicitly [BE/core/genai_client.py:34-48].
  - The landing page states: "Google's Gemini, in two passes" [LandingPage.tsx:125].
- **Sources**:
  - Grounding URLs are merged and deduplicated into `research_data.sources` [master_agent.py:518-539].
  - They are excluded from the generation prompt ("isn't used by any slide instruction") [:866-872].
  - The research JSON is truncated to 6,000 chars, or 3,000 in compact mode [:874].
  - If grounded search fails, the pass is retried without search, meaning from model memory [:467-477]. On quota errors it retries with the generation key [:497-511], else it proceeds with website data only [:513-516].
- **Profile provenance**: profile values carry a source (crawl, research, derived, or founder), a method, a URL and an as_of date, and are rendered as "[third-party research · … · as of …]" [BE/profile/prompt.py:22-61]. The rendered block is capped at 14,000 chars, Required groups first [:72-117]. `profile_gaps_note()`, which would tell the model what is unknown, is defined [:120] but never called (grep found no callers).
- **Claims auditor** [BE/agents/audit/claims_auditor.py:88-247]. The score is 100 − 15×errors − 5×warnings, floored at 0, and "a triage aid… not a measure of deck quality". Its 11 checks:
  1. Empty slides
  2. Placeholder text: "...", lorem, TBD, "Bold lead", "Competitor N", "not disclosed"
  3. Ask, capTable and evidence percentages must total 100 (error)
  4. TAM ≥ SAM ≥ SOM (error)
  5. ARR tiles must match founder ARR (or MRR×12) within 5%, and revenue shown with none supplied is flagged as invented (error)
  6. A traction slide at idea or pre_revenue (warning)
  7. SOC2/ISO27001/HIPAA/GDPR/PCI-DSS/FedRAMP named without evidence or a hedge (warning)
  8. Fewer than 2 competitors, or a self-wins-every-row matrix (info)
  9. A roadmap item with no quarter label
  10. "No competition" claims, and growth % with no period or baseline
  11. LTV:CAC below 3, or CAC payback above 18 months (info)
  
  Tests: 15 in [ipreneur/backend/test_claims_auditor.py:8-95], untracked.
- **Audit visibility**: the audit is stored in `research_summary.audit` [master_agent.py:400]. No frontend file references it; the only "audit" hit in `FE/` is in sample copy in `DT/sampleDeck.ts`.
- **Appendix evidence deck** [uncommitted]: rules "APPENDIX OVERRIDE… where the data does not support a field, leave it empty rather than estimating — an appendix with a gap is credible, an appendix with an invented number is a diligence failure" [sections.py:771-781]. Tests cover registration, default set, fill-driven inclusion, ordering, cap, and prompt build [ipreneur/backend/test_appendix.py:14-76], untracked.
- **Research UI**: the sources panel shows confidence badges and a source list [ResearchSourcesPanel.tsx:25-33, 57-73, 93, 115, 159].
- **Sample output `pipeline_output.json`** [uncommitted modification]:
  - It was produced by `test_pipeline.py` (legacy crawl → branding → research → analysis) for `https://linear.app` with business_model saas and stage series_a.
  - Its content is the hard-coded fallback from [BE/agents/research/research_agent.py:604-631]: market_size "Large and growing Technology market", growth "Strong double-digit CAGR", TAM "Large market", SAM "Significant SAM", SOM "Achievable SOM", competitors "Existing solutions" / "Generic platforms".
  - Founders, funding and headcount are all empty, and company_name is "Linear — The system for product development".
  - The analysis block is equally generic: investor_score 6/10, revenue scenarios $500K / $2M / $8M ARR, confidence 35–60%.
  - The legacy research prompt itself forbids exactly these values ("NEVER return "Existing solutions", "Generic platforms"") [research_agent.py:520].

### Inferences
- `pipeline_output.json` shows what happens when the legacy LLM call fails: the deck silently fills with generic, forbidden placeholder content. It says nothing about current MasterDeckAgent quality.
- The confidence labels the research pass collects are flattened at generation time by the blanket "(HIGH CONFIDENCE — use this directly)" header. MEDIUM items, defined as "reasoned from industry", reach slides presented as verified.
- Only the auditor checks claims after generation. It cannot verify facts against sources; it only checks internal consistency against founder inputs.

### Gaps
- No real MasterDeckAgent output was found to summarise. The `generated_presentation_*.pptx` files in `ipreneur/backend/` were not opened.

## 7. What is the pricing and billing model, and what does the landing page claim?

### Takeaway
There are three plans: Free at $0 with "3 pitch decks/month", Pro at $29/mo with "50 pitch decks/month", and Enterprise at custom pricing. Pro is sold as a Razorpay monthly subscription [uncommitted migration from Stripe]. **Plan limits are displayed but not enforced anywhere.** The landing page brands the product "Mint" and promises a two-pass researched deck, 40 designs, in-place editing and native PPTX. It is candid about missing features: no PDF, no share link, no view tracking.

### Cited Findings
- **Plans**:
  - Free: "3 pitch decks/month", "Basic templates", "PPTX export".
  - Pro, $29/mo: "50 pitch decks/month", "Premium templates", "PPTX + PDF export", "Priority AI processing".
  - Enterprise, custom: "Unlimited decks", "Custom branding", "API access", "Team collaboration", "Dedicated support".
  
  [BE/api/v1/endpoints/billing.py:84-103]
- **Limits**: `PLAN_LIMITS` sets free 3/3, pro 50/50 and enterprise/admin unlimited for projects and exports [billing.py:58-63]. The only references to `PLAN_LIMITS`, `projects_limit` or `exports_limit` are in billing.py itself. No project-creation or analyze path checks them [projects.py:100-116, 535-560].
- **Billing page**: the usage meter counts total projects, not decks per month (`decksUsed = projectData.total`) [FE/pages/billing/BillingPage.tsx:153, 207-211]. "Export counts are not tracked yet" [BillingPage.tsx ~212].
- **Razorpay flow** [uncommitted]:
  - `POST /billing/checkout` creates a subscription on `razorpay_pro_plan_id` with `total_count: 120` [billing.py:113-140].
  - `/verify` checks an HMAC-SHA256 signature and sets role = pro [:149-175]. `/cancel` cancels at cycle end [:178-192]. The webhook downgrades the role [BE/api/v1/endpoints/webhooks.py:58].
  - Config replaced the Stripe keys with Razorpay keys [BE/core/config.py:114-120]. The model gains `razorpay_subscription_id` [BE/models/models.py:291].
  - Client checkout: `checkout.razorpay.com/v1/checkout.js`, name "iPreneur", description "Pro plan", colour #2563EB [FE/services/razorpay.ts:3, 44-47], untracked.
- **Landing claims**:
  - "Autonomous AI Pitch Deck Generator" [HeroSection.tsx:66]; "A website goes in. A deck comes out." [LandingPage.tsx:196]
  - "Mint reads your site and the public material around it to work out what you build, who you sell to, and how you make money" [:50]
  - "A first pass runs live web research to gather market size, competitors and comparable companies… Market figures arrive with the reasoning attached, so you can check a number before an investor does." [:57]
  - "Try all 40 designs on your finished deck." [:64]
  - "Values carry where they came from — you, your website, or research." [:400]
  - The deck-type groups are "Raising money", "Selling and going to market", "Explaining the company" and "Deciding internally" [:70-101].
  - The hero sample deck is a fictional clinical-trials company (TAM "Global clinical trial recruitment software", "Serviceable Market: $960M", team "Ex-IQVIA", "Ex-Epic") [HeroSection.tsx:128-303].
- **Brand naming**: the landing page uses "Mint" and `MintLogo` [HeroSection.tsx:14, 41; LandingPage.tsx:50, 137]. Billing and checkout say "iPreneur" [billing.py:122; razorpay.ts:44].

### Inferences
- The pricing copy contradicts the product. Pro advertises "PPTX + PDF export", but the landing page says "No PDF export". "Premium templates" are not gated: the only plan checks are role transitions in billing and webhooks. "/month" quotas are neither monthly nor enforced.
- Prices are shown in USD ("$29/mo"), but checkout runs through Razorpay, an India-focused gateway. The amount actually charged comes from the Razorpay dashboard plan and is not visible in code, so the displayed and charged currency or amount could disagree.

### Gaps
- The Razorpay plan's amount and currency are not in the repo.
- `webhooks.py` was read only at its role-downgrade line.

## 8. What are the obvious gaps, hard-coded assumptions, or weaknesses in deck generation?

### Takeaway
The architecture is clean: a single registry, a typed section catalogue, anti-fabrication rules and an auditor. The investor content model, though, is generic, SaaS-shaped and USD-only. The investor deck misuses a partnership GTM section, most deck types fall short of the 20–30 slide target, and stage, sector and geography awareness is shallow or inconsistent. Market sizing is the weakest link: it is mandated to be filled, it is unsourced in `template_data`, and it is labelled HIGH confidence.

### Cited Findings
1. **Partnership GTM slide in the investor deck.** `gtm` is the partnership section "Go-to-Market Together" ("Each phase names the joint activity and which side owns it"). It is reused in investor, general, business and master [sections.py:465-471; registry.py:74, 82, 306, 389, 412; DT/deckTypes.ts:61].
2. **Below the slide target.** 9 of 14 types are under 20 slides (sales 14, product 14, partnership 15, internal 10, update 8, vision 8, elevator 5, demoday 10, appendix default 8) [registry.py:107-447]. The `general` goal text says "twelve slides" but the type has 20 [registry.py:302-308].
3. **Stage handling is shallow and inconsistent.** Emphasis is investor-only [prompt.py:89]. Slide overrides exist only for idea and pre_revenue [registry.py:101-104, 352-355]. `pre_seed` counts as pre-revenue in relevance [relevance.py:191] but still gets traction, unitEconomics and financials. The auditor's stage check covers 2 stages [claims_auditor.py:169]. The ask skeleton defaults to "Raising $XM Series A" [sections.py:388].
4. **Market sizing.** It is mandated "never blank… If research is empty, estimate" [sections.py:267-268]. `MarketPoint` has no source field [:87-97]. "bottom-up methodology" is requested [:318], but the research schema's example is top-down [master_agent.py:767-779]. The auditor checks only TAM ≥ SAM ≥ SOM [claims_auditor.py:132-143].
5. **Projection extrapolation.** `Year N MRR = X * (1+G)^(12N)` [sections.py:277] compounds monthly growth for 12N months and conflicts with "never… extrapolate" [master_agent.py:989].
6. **Confidence is flattened.** The whole research block is labelled "(HIGH CONFIDENCE — use this directly)" regardless of per-item confidence [master_agent.py:883-886]. Sources are removed from the generation prompt [:866-872], and research is truncated to 6,000 chars [:874].
7. **Competition.** It is a boolean feature matrix only, and the prompt says "This company… should win most rows" [sections.py:347]. The auditor merely notes a full sweep [claims_auditor.py:193-196]. There is no positioning map in the investor deck, and the example competitors are India-specific [master_agent.py:681-683].
8. **Ask and use of funds are thin.** The model is only headline, sub and use ≤4 {label, %} [sections.py:172-175, 384-390]. Valuation, instrument, runway and milestones-from-raise exist as profile parameters (`instrument`, `pre_money_valuation`, `runway_generated`, `milestones_from_raise` in the fundraising group [BE/profile/parameters.py]) but have no slot in the ask slide. The auditor does not compare the ask amount to `ask_amount_usd`.
9. **Financials are thin.** It is a single area chart plus 4 KPIs (traction renderer). The example years FY24–FY27 are hard-coded, not date-resolved [sections.py:673]. There is no P&L table and no burn multiple, and series units are forced to $M [:337].
10. **Team.** The cap is 4 members [sections.py:375]. The empty fallback "Details available on request" [:380] contradicts the banned filler "Available upon request" [master_agent.py:990]. There are no hiring-plan or advisor requirements.
11. **Currency and geography.** Inputs are USD-only [NewProjectPage.tsx:935-956], profile formatting is "$" [BE/profile/prompt.py:43-46], and the auditor cannot parse ₹, Cr or lakh [claims_auditor.py:24, 43]. India-centric examples sit alongside no geography intake field [master_agent.py:681-711, 904].
12. **No sector logic.** Business model and industry do not change sections or KPIs [master_agent.py:345-355]. The `ai_ml_conditional` group has no condition [relevance.py:120].
13. **Skeleton example leakage.** Concrete example figures appear in skeletons [sections.py:294, 336, 388, 644, 673]. The auditor cross-checks only ARR, MRR and revenue labels [claims_auditor.py:145-166]. Customer counts, NRR, growth % and TAM are not checked against founder inputs.
14. **Token budget.** The deck is emitted twice in one response (`slides[]` + `template_data`) [master_agent.py:997-1009]. The code acknowledges that 20–25-slide types are reachable truncation cases [:138-147], and the compact retry is "a heuristic second chance, not a fix" [:321-325].
15. **Profile catalogue typing bugs.** `company_stage` is typed "percent" with unit "%" [BE/profile/parameters.py:62], so the renderer will append "%" to values such as "Seed" [BE/profile/prompt.py:47]. `funding_stage` is typed "currency" with unit "USD" [parameters.py:689]. The catalogue is generated from `Pitch Deck Parameters.docx` by `scripts/gen_parameters.py` [parameters.py:1-15].
16. **Dead helpers.** `profile_gaps_note()` [BE/profile/prompt.py:120] and `upcoming_quarters()` [BE/decks/prompt.py:28] are defined but never called.
17. **Auditor invisible to users.** Findings are stored, but no frontend reads them [master_agent.py:400; no `audit` usage in FE/ outside sample copy].
18. **Billing.** Limits are unenforced [billing.py:58-75]. Plan copy contradicts the product (PDF, "Premium templates", "/month"). Brand naming is split between "Mint" and "iPreneur".
19. **Legacy surface.** `POST /api/v1/pipeline/generate` is still mounted and has no auth dependency [pipeline.py:25-26; routes/__init__.py:31]. The legacy research fallback silently emits forbidden generic placeholders [research_agent.py:604-631], as the checked-in `pipeline_output.json` shows.
20. **Theme suggestion.** The AI can only suggest 10 of the 40 themes [prompt.py:129].
21. **Repo hygiene (security).** The untracked `ipreneur/backend/env.cloudrun.yaml` contains populated secret values (APP_SECRET_KEY, GEMINI_API_KEY, GEMINI_API_KEY_2, JWT_SECRET_KEY, S3_SECRET_KEY, each 53–64 chars) and is **not** covered by `.gitignore` (`git check-ignore` returned no match). Values were not inspected.
22. **The team's own gap analysis.** PROJECT_LOG records that `Pitch Deck Parameters.docx` specifies about 470 unique parameters in 28 master groups across 9 (+5) deck types, versus about 23 intake fields at the time. The work that followed produced the 924-parameter profile, 6 new deck types and the Appendix [ipreneur/PROJECT_LOG.md:691-739]. The log also notes the spec "never defines the letters" R/C/O/A/N [:731-735].

### Inferences
- Measured against a typical investor checklist, the generated investor deck lacks dedicated why-now, milestones and traction-to-date, round terms or valuation, use-of-funds-to-milestones, and exit or comparables slides. It also spends slots on a gallery and a partnership-style GTM.
- The registry is cheap to change: a deck is a tuple of keys. Most gaps (a proper investor GTM section, a why-now section, stage-specific sequences for pre-seed through growth, adding an ask "terms" and runway field) are data or prompt changes rather than renderer work. New fields on `AskSection` would also need renderer and PPTX changes.
- The strong anti-fabrication posture for people and customers contrasts with the permissive posture for market numbers. The market slide is the most likely place for investors to find unsupported claims.

### Gaps
- None of this was checked against live generated decks; all conclusions come from static reading of prompts and code.
- The per-deck R/C/O relevance tables [relevance.py:71-185], the PPTX renderer, and the `Pitch Deck Parameters.docx` spec itself were not fully reviewed.
