# Rebuild iPreneur's Decks Around Sourced Evidence

iPreneur (branded "Mint" on its landing page) turns a website or a short intake form into one of 14 deck types. It makes one Gemini web-research pass and one generation pass, renders the result in any of 40 themes and exports PPTX. Its flagship Investor deck is **24 slides, one section per slide, in a fixed order**. That deck has nearly every ingredient investors ask for, but the proportions and the evidence are wrong. Investors give a deck roughly **2.5–4 minutes**. Completion falls as decks pass about 16 pages. Every current framework converges on a core of roughly ten slides: purpose, problem, solution, product, market, business model, traction, competition, team and ask. Sequoia and DocSend add "why now", which iPreneur has no section for. The most damaging gaps are about credibility, not design:

- The prompt forces a TAM/SAM/SOM number even when research found nothing.
- The market schema has no field for a source.
- All research is labelled "HIGH CONFIDENCE", whatever its actual confidence.
- The investor go-to-market slide is a partnership template reused by mistake.
- The claims auditor that could catch these problems never reaches the user.

Stage, sector and geography barely change the output. Every stage from pre-seed through growth gets the same 24 slides, the KPIs are SaaS-shaped, and all money is in USD, even though the prompts use Indian examples and billing runs through Razorpay. A deck type in iPreneur is just an ordered list of section keys, so most fixes are registry and prompt edits:

- Restructure the investor deck into a core of about 14–16 slides plus a data-driven appendix. That still meets the team's 20–30-slide target.
- Add why-now and a real investor go-to-market slide.
- Make every number carry a source.
- Add stage, sector and India modes.

Gamma, Google, Microsoft and OpenAI are turning generic deck generation into a commodity. Competitors have left one position open: cited, audited, stage-aware fundraising decks that work in India.

## iPreneur writes a 24-slide investor deck in two Gemini passes

### How a deck gets built

A founder starts by choosing:

- one of **14 deck types**
- a stage (idea through growth, plus bootstrapped)
- a business model
- a presenter or standalone format

They can also enter numbers: ARR, MRR, customers, MoM growth, churn, CAC, LTV, NRR and the ask amount. **Every money field is in USD** ([NewProjectPage.tsx](../ipreneur/frontend/src/pages/workspace/NewProjectPage.tsx#L935)).

The backend then runs these steps:

1. It crawls up to 18 pages of the founder's site with Playwright.
2. A single `MasterDeckAgent` makes its first pass with `gemini-3.8-flash` and Google Search grounding. This pass collects founders, funding, competitors and market sizes, and tags each item HIGH, MEDIUM or LOW confidence ([master_agent.py](../ipreneur/backend/app/agents/master/master_agent.py#L642)).
3. A second pass writes the whole deck in one JSON response, and writes it twice: once as a legacy `slides[]` array and once as a richer `template_data` object.
4. Pydantic validates the output and truncates each section's lists to their caps.
5. A new claims auditor, not yet tracked in git, runs 11 deterministic checks and stores an advisory 0–100 score. The checks include percentages that sum to 100, TAM ≥ SAM ≥ SOM, ARR matching the founder's input, SOC 2 or HIPAA claims made without evidence, and LTV:CAC below 3 ([claims_auditor.py](../ipreneur/backend/app/agents/audit/claims_auditor.py#L88)).
6. A server-side renderer builds the PPTX ([projects.py](../ipreneur/backend/app/api/v1/endpoints/projects.py#L101)).

An older three-agent pipeline is still mounted at `/api/v1/pipeline/generate`, but no project uses it.

### How decks are structured

Every section is exactly one slide. A deck type is an ordered list of keys drawn from 45 content sections and 20 appendix "evidence" sections, and all of them are drawn by 16 shared renderers ([sections.py](../ipreneur/backend/app/decks/sections.py#L1)). Only five of the 14 types reach the team's 20-slide floor:

| Deck type | Slides | Research | Deck type | Slides | Research |
|---|---|---|---|---|---|
| Investor | 24 (22 at idea/pre-revenue) | full | Elevator | 5 | light |
| Master | 25 | full | Demo Day | 10 | full |
| Business | 24 | full | Internal | 10 | none |
| GTM | 22 | full | Update | 8 | none |
| General | 20 | full | Vision | 8 | full |
| Partnership | 15 | full | Appendix | 8 default, up to 22 | light |
| Sales / Product | 14 each | light | | | |

The Investor deck runs in this order ([registry.py:71-75](../ipreneur/backend/app/decks/registry.py#L71)):

1. cover
2. executive summary
3. origin story
4. problem & solution
5. user persona
6. product
7. image gallery
8. technology & IP
9. TAM/SAM/SOM
10. customer segments
11. business model
12. traction
13. proof & case studies
14. unit economics
15. competition
16. moat
17. go-to-market
18. financials
19. roadmap
20. risks
21. team
22. ask
23. cap table
24. closing

At idea and pre-revenue stages, the traction, unit-economics and financials slides are replaced by a single vision slide, which gives 22.

The 40 themes come in four families. They are token sets layered over the same renderers on a fixed 1280×720 canvas, so every theme renders every section by construction. The AI, however, can only suggest the 10 "Classic" themes ([themes.ts](../ipreneur/frontend/src/components/workspace/deckTemplates/themes.ts#L368); [prompt.py:129](../ipreneur/backend/app/decks/prompt.py#L129)).

### What the prompts tell the model

The prompts are the most investor-aware part of the product. They forbid inventing people, customers, logos, quotes, certifications, patents or cap tables ("An honest gap beats a fabricated fact"). They require founder figures "exactly — never round, inflate, or extrapolate". They also apply a specificity test: "Could I paste this sentence into a rival company's deck … without changing a word? If yes, REWRITE IT" ([master_agent.py:972-995](../ipreneur/backend/app/agents/master/master_agent.py#L972)).

The same prompts make market numbers mandatory: "Every figure must be a specific number, never blank … If research is empty, estimate realistically from the industry" ([sections.py:266-278](../ipreneur/backend/app/decks/sections.py#L266)).

### Plans and pricing

There are three plans: Free (3 decks a month), Pro ($29 a month, billed through Razorpay) and Enterprise. **No code path enforces the plan limits.** Pro advertises "PPTX + PDF export", but the landing page admits there is no PDF export, no share link and no view tracking ([billing.py](../ipreneur/backend/app/api/v1/endpoints/billing.py#L58); [LandingPage.tsx](../ipreneur/frontend/src/pages/LandingPage.tsx#L451)).

## Investors agree on a ten-slide core and give it about four minutes

### Every published framework shares the same core

The major frameworks overlap far more than they differ:

- **Sequoia** has ten sections: purpose, problem, solution, why now, market, competition, business model, team, financials and vision ([Sequoia](https://www.sequoiacap.com/article/writing-a-business-plan/)).
- **Michael Seibel (YC)** builds a pitch on seven questions: what you do, market size, progress, unique insight, business model, team and the ask ([Seibel](https://www.michaelseibel.com/blog/how-to-pitch-your-company)).
- **CRV's August 2026 seed guide** prescribes cover, problem, solution, product, bottom-up market, business model, traction, competition, team and ask. It observes that **most seed decks run 10–12 slides** ([CRV](https://www.crv.com/content/seed-pitch-deck)).
- **DocSend's 2026 seed guide** lists twelve slides and marks why-now and financials as optional ([DocSend](https://www.docsend.com/blog/what-vcs-really-want-to-see-inside-your-seed-deck/)).
- **TechCrunch's 2023 list** reaches sixteen by giving mission, value proposition, go-to-market and use of funds their own slides ([TechCrunch](https://techcrunch.com/2023/08/30/pitch-deck-slide-suggestions/)).

| Slide | Sequoia | YC (Seibel, Ralston) | Kawasaki\* | CRV 2026 | DocSend 2026 | TechCrunch 2023 |
|---|---|---|---|---|---|---|
| Purpose / one-liner | ✓ | ✓ | in summary | ✓ (cover) | ✓ | ✓ |
| Problem / solution | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Why now | ✓ | implicit | – | – | optional | – |
| Product | in solution | ✓ | "underlying magic" | ✓ | ✓ | ✓ |
| Market | ✓ | ✓ bottom-up | – | ✓ bottom-up | ✓ | ✓ |
| Business model | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Traction | – | ✓ central | status | ✓ | ✓ | ✓ |
| Go-to-market | – | – | ✓ | – | – | ✓ |
| Competition | ✓ | – | ✓ | ✓ | ✓ | ✓ |
| Team | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Financials | "if you have any" | little at seed | 3–5 years | appendix | optional | ✓ |
| Ask / use of funds | – | ✓ | ✓ | ✓ | ✓ | ✓ (two slides) |
| Vision | ✓ | – | – | – | – | mission |

\*Kawasaki's ten slides as commonly reproduced; his site blocked direct verification ([AhaSlides summary](https://ahaslides.com/blog/10-20-30-rule-presentations)).

**Where they disagree.** Sequoia has no traction slide and no ask slide, a holdover from its business-plan format. Every current guide built on deck data includes both, so a generator should treat them as mandatory. The contested extras each have one credible backer:

- why now and vision (Sequoia)
- unique insight (YC)
- go-to-market (Kawasaki and TechCrunch)
- risks (Reid Hoffman, who wished LinkedIn's Series B deck had listed them ([Wamda](https://www.wamda.com/2013/10/reid-hoffman-linkedin-pitch-deck-10-pieces-advice)))

These are the slides that can honestly take a deck from 10 to 15. **No major framework requires a standalone moat, product-roadmap or image-gallery slide.** Sequoia folds durability into the solution slide, and CRV folds "why customers choose you" into competition.

### Each core slide has a job and a known way to fail

| Slide | What it must contain | What sinks it |
|---|---|---|
| Cover / purpose | Name, a plain-language one-liner, stage and raise amount ([CRV](https://www.crv.com/content/seed-pitch-deck)) | A cover that "makes someone guess what you build"; jargon like "platform" ([CRV](https://www.crv.com/content/seed-pitch-deck); [Seibel](https://www.michaelseibel.com/blog/how-to-pitch-your-company)) |
| Problem | A specific buyer's pain, how they handle it today, and "a number on the cost" ([Sequoia](https://www.sequoiacap.com/article/writing-a-business-plan/); [CRV](https://www.crv.com/content/seed-pitch-deck)) | A problem section so long that listeners learn late what you do ([YC, Ralston](https://www.ycombinator.com/blog/guide-to-demo-day-pitches/)) |
| Solution / insight | The concrete answer tied to the problem, the non-obvious insight, and why it lasts ([Sequoia](https://www.sequoiacap.com/article/writing-a-business-plan/); [Seibel](https://www.michaelseibel.com/blog/how-to-pitch-your-company)) | A weak insight stated passionately, which "makes you look worse" ([Seibel](https://www.michaelseibel.com/blog/how-to-pitch-your-company)) |
| Why now | Why the solution could not have been built earlier ("Why hasn't this been done before?") ([Sequoia](https://www.sequoiacap.com/article/writing-a-business-plan/); [YC, Ralston](https://www.ycombinator.com/blog/guide-to-demo-day-pitches/)) | Being skipped, which DocSend's own guide permits |
| Product | Screenshots or a demo for a read-alone deck ([CRV](https://www.crv.com/content/seed-pitch-deck)); a short list of steps for a projected deck ([YC, Hale](https://www.ycombinator.com/blog/how-to-design-a-better-pitch-deck)) | Spending too long on the product story ([TechCrunch](https://techcrunch.com/2023/08/30/pitch-deck-slide-suggestions/)) |
| Market | Bottom-up sizing: reachable customers × revenue per customer ([CRV](https://www.crv.com/content/seed-pitch-deck); [Seibel](https://www.michaelseibel.com/blog/how-to-pitch-your-company)) | Top-down numbers that "read as hollow" ([CRV](https://www.crv.com/content/seed-pitch-deck)); "1% of a huge TAM" math ([Waveup](https://waveup.com/blog/what-to-include-in-a-pitch-deck/)) |
| Business model | One pricing model, tied to unit economics ([CRV](https://www.crv.com/content/seed-pitch-deck); [Entrepreneur on Hoffman](https://entrepreneur.com/business-news/billionaire-reid-hoffman-reveals-linkedins-2004-pitch-deck/229469)) | Listing a mix of revenue streams ([Seibel](https://www.michaelseibel.com/blog/how-to-pitch-your-company)) |
| Traction | Labelled growth, revenue, retention or usage, with the conclusion written on the chart ([CRV](https://www.crv.com/content/seed-pitch-deck); [YC, Hale](https://www.ycombinator.com/blog/how-to-design-a-better-pitch-deck)) | Cumulative graphs, which "always cause immediate suspicion" ([YC, Ralston](https://www.ycombinator.com/blog/guide-to-demo-day-pitches/)) |
| Go-to-market | How you acquire customers, with named channels; Airbnb cross-posted to Craigslist ([Slidebean](https://slidebean.com/blog/startups-airbnb-pitch-deck)) | No answer to "How exactly will you get your first hundred customers?" (Elizabeth Yin's reported question, secondhand, [Gatekeep](https://gatekeep.vc/vcs/3c734a5e-ccb6-4c03-af18-93737c4177e3)) |
| Competition | Named direct and indirect alternatives, a plan to win, and a 2×2 or feature table ([Sequoia](https://www.sequoiacap.com/article/writing-a-business-plan/); [CRV](https://www.crv.com/content/seed-pitch-deck)) | "No competitors"; rigged axes with your logo alone in the top right ([Vestbee](https://vestbee.com/insights/articles/most-common-pitch-deck-mistakes-according-to-v-cs); [Waveup](https://waveup.com/blog/how-to-make-a-winning-competition-slide-for-your-pitch-deck/)) |
| Team | Founder-problem fit, a technical co-founder, full-time status, how long the founders have known each other, and the equity split ([Seibel](https://www.michaelseibel.com/blog/how-to-pitch-your-company)) | A team without real experience of the problem, which "shows in flawed assumptions" ([Vestbee](https://vestbee.com/insights/articles/most-common-pitch-deck-mistakes-according-to-v-cs)) |
| Financials | A driver-based operating plan with its assumptions shown; spreadsheets go in the appendix ([TechCrunch](https://techcrunch.com/2023/08/30/pitch-deck-slide-suggestions/); [CRV](https://www.crv.com/content/seed-pitch-deck)) | Aggressive curves, which investors "discount automatically" ([TechCrunch](https://techcrunch.com/2023/04/10/build-a-bottom-up-financial-model-to-show-potential-investors-youre-serious)) |
| Ask | One amount and the instrument, plus use of funds in a few categories, "each tied to a dated milestone" ([CRV](https://www.crv.com/content/seed-pitch-deck)) | "A fuzzy ask says you have not mapped money to milestones" ([CRV](https://www.crv.com/content/seed-pitch-deck)) |
| Risks | Named risks with mitigations ([Wamda](https://www.wamda.com/2013/10/reid-hoffman-linkedin-pitch-deck-10-pieces-advice)) | A deck that "reads like all the answers are already known" ([Vestbee](https://vestbee.com/insights/articles/most-common-pitch-deck-mistakes-according-to-v-cs)) |

### Where investors spend their reading time

DocSend data shows which slides deserve the most generator effort:

- **2021 seed report:** successful decks drew **94% more time on the business model and 236% more on financials** than unsuccessful ones, and 78% *less* on traction ([PR Newswire](https://www.prnewswire.com/news-releases/show-us-the-momentum-new-docsend-report-reveals-vcs-pushing-seed-startups-on-business-model-traction-and-financials-301382159.html)).
- **2022:** the team slide appeared in every deck. Unsuccessful decks often had no competition slide, and none of them included financials ([TechCrunch](https://techcrunch.com/2022/09/22/science-of-pitch-decks/amp)).
- **2024 compared with 2023:** investors spent **40% more time on seed team slides**. They spent 19% less on pre-seed market size and 48% less on seed competition ([DocSend via StockTitan](https://www.stocktitan.net/news/DBX/v-cs-prioritize-people-in-an-ai-heavy-landscape-according-to-new-z3rqvcox6orq.html)).

Team, business model, financials and traction therefore earn the richest schemas and the strictest validation. Market size is turning into a hygiene slide: it has to be credible, not impressive.

### A 12–18-slide core plus an appendix fits the data best

Recent data runs against long main decks:

- DocSend's 2023 numbers showed average deck length falling **from 19 slides to 16**. **65% of unsuccessful pre-seed teams had longer-than-average decks** ([TechCrunch](https://techcrunch.com/2023/08/30/pitch-deck-slide-suggestions/)).
- Papermark's 2026 report covers 24,541 decks. Completion drops **about 20 points from 8 to 16 pages**, and **only 44% of investors reach the last slide** ([Papermark](https://www.papermark.com/fundraising-report)).
- CRV lists "40-slide decks" as a mistake ([CRV](https://www.crv.com/content/seed-pitch-deck)).
- YC's Kevin Hale sized Demo Day decks at **5–7 slides** ([YC](https://www.ycombinator.com/blog/how-to-design-a-better-pitch-deck)).

Very short decks fare badly too:

- DocSend's older study found successful decks averaged 20 pages against 17 for failures ([TechCrunch 2019](https://techcrunch.com/2019/04/12/data-tells-us-that-investors-love-a-good-story)).
- DocSend's seed guide still recommends 19–20 pages ([HummingDeck summary](https://hummingdeck.com/blog/pitch-deck-benchmarks-2026)).
- Papermark found decks of 9–24 pages drew 27 views, against 17 for decks under nine pages ([Papermark](https://www.papermark.com/fundraising-report)).

Taken together: a deck needs enough slides to make the argument, and every slide past about 16 costs readers. Rippling shows how far the appendix can stretch. It raised a $45M Series A with a memo and **46 slides of metrics**, and no narrative deck ([Rippling](https://www.rippling.com/blog/rippling-series-a-pitch-deck-and-memo)).

Format matters as much as length. TechCrunch's Haje Jan Kamps distinguishes four decks ([TechCrunch](https://techcrunch.com/2022/07/18/pitch-deck-contexts/)):

- a 3–4-slide teaser
- a wordier send-ahead PDF with no appendices
- a presentation deck with **at most ten words and at least 35-point type** per slide
- a leave-behind, "the only time you send appendices"

Some investors prefer prose. Hustle Fund's Elizabeth Yin finds written pitches "faster to process" ([Mercury](https://blog.mercury.com/series-tea/elizabeth-yin)).

**For iPreneur's 20–30-slide target:** a 24-slide main narrative is above every recent average. The two can be reconciled by counting a clearly separated appendix toward the total, giving a core of about 14–16 slides plus 6–12 appendix slides.

### Lead with the strongest proof

Sequoia's order is the default. DocSend found successful decks followed it closely "except that product and team moved earlier". Opening matters:

- In failed decks, investors spent about **61 seconds on an opening product page**. In successful decks they spent about **22 seconds on a company-purpose opener** ([TechCrunch 2019](https://techcrunch.com/2019/04/12/data-tells-us-that-investors-love-a-good-story)).
- Putting **traction in the first three slides was associated with 20% more views**. Papermark notes this is correlation, not a tested cause ([Papermark](https://www.papermark.com/fundraising-report)).
- YC's Geoff Ralston tells founders with strong traction to open with it. Without it, "you must rely more on your story, credentials, and vision" ([YC](https://www.ycombinator.com/blog/guide-to-demo-day-pitches/)).
- Hoffman opened LinkedIn's data-light Series B with the investment thesis ([Entrepreneur](https://entrepreneur.com/business-news/billionaire-reid-hoffman-reveals-linkedins-2004-pitch-deck/229469)).

A generator therefore needs three ordering profiles, chosen from the data it has:

- **Balanced:** problem, solution, why now, product, market, model, traction, go-to-market, competition, team, ask.
- **Traction-led:** a headline metric on slide 2 or 3.
- **Team-led:** for pre-product, deep-tech and repeat founders. The thesis and team come early, and validation and risks come later.

## Benchmarks shift sharply by stage, sector and AI exposure

A deck's numbers are read against the bar for its stage and sector. In 2026 those bars are high and pulled upward by AI. Cooley's Q1 2026 sample had the lowest deal volume since Q3 2016. **98.2% of priced deals carried a 1x liquidation preference and 96.4% were non-participating** ([Cooley](https://www.cooley.com/news/insight/2026/2026-04-29-q1-2026-venture-financing-report)). Carta data put AI seed pre-money at $19M against $13M for non-AI ([Waveup citing Carta](https://waveup.com/blog/seed-round-benchmarks/)). Blended medians therefore overstate what a non-AI company should expect.

### US stage benchmarks, 2025 to mid-2026

| Stage | Typical round and price | Instrument | Traction bar investors cite | Runway and the milestone the round must buy |
|---|---|---|---|---|
| Pre-seed | Post-money SAFE caps ≈$10M for raises under $1M, ≈$15M for $1–2.5M ([Carta](https://carta.com/data/state-of-pre-seed-2025-full-report/)) | SAFEs in 93% of rounds, 91% of them post-money ([Waveup citing Carta](https://waveup.com/blog/seed-round-benchmarks/)) | A working MVP or "strong early validation" ([CRV](https://www.crv.com/content/startup-traction)) | Launch, first paying customers, early retention |
| Seed | $3.0M median deal, all sectors (PitchBook-NVCA H1 2026); **$4.1M at $24.3M post-money, ~18% dilution** for priced software rounds (Carta) ([Waveup](https://waveup.com/blog/seed-round-benchmarks/)) | Priced round or large SAFE | **$0.5–1.5M ARR** for B2B SaaS, with growth weighted as heavily as ARR ([CRV](https://www.crv.com/content/startup-traction)); uncited guides go as low as $50–200K ([ValueAddVC](https://valueaddvc.com/blog/startup-funding-rounds-in-2025-whats-normal-at-pre-seed-seed-a-and-b)) | **24 months**: the median seed-to-A gap was 616 days in Q2 2025 and 1.9 years by Q4 2025 ([Waveup citing Carta](https://waveup.com/blog/seed-round-benchmarks/)) |
| Series A | $15M median (Crunchbase 2025) to $19.4M (PitchBook Q2 2026) ([CRV](https://www.crv.com/content/startup-traction); [ValueAddVC](https://valueaddvc.com/blog/startup-funding-rounds-in-2025-whats-normal-at-pre-seed-seed-a-and-b)) | Priced preferred, 1x non-participating | **Median Series A company revenue $2.5M in 2025**; a $2–5M ARR floor for competitive B2B SaaS ([CRV](https://www.crv.com/content/key-performance-indicators)) | 18–24+ months to reach $5–10M ARR and a repeatable go-to-market engine |
| Series B | Pre-money ≈$119M (Carta Q3 2025, via [Zeni](https://www.zeni.ai/blog/series-b-valuations)) to $165M (Cooley Q1 2026) | Priced preferred; median dilution **12.9%** in 2025 ([Carta](https://carta.com/data/state-of-private-markets-q4-2025/)) | $5–10M ARR growing 80–120%, NRR above 115% (uncited, [ValueAddVC](https://valueaddvc.com/blog/startup-funding-rounds-in-2025-whats-normal-at-pre-seed-seed-a-and-b)) | A path to $20M+ ARR with efficiency |

The seed bar is genuinely disputed, so growth rate and retention should gate the seed story, not absolute ARR. These are US medians. Indian rounds run roughly a third of the size (see below).

### SaaS efficiency metrics

A venture raise needs top-quartile numbers, not medians.

| Metric | Private-SaaS median | What a venture raise needs | Source |
|---|---|---|---|
| ARR growth | ≈20% (2025, all sizes) | Companies at $1–10M ARR average "nearly 200%"; the middle half grow 100–230% | [Sapphire/KeyBanc](https://info.sapphireventures.com/2025-keybanc-capital-markets-sapphire-ventures-saas-survey); [Bessemer](https://www.bvp.com/assets/uploads/2021/09/Scaling-to-100-Million-by-Mary-DOnofrio_updated2024.pdf) |
| Net revenue retention | 102% ($25–50K ACV band); top quartile 111% | ≥110% at A and ≥115–120% at B (uncited) | [SaaS Capital](https://www.saas-capital.com/research/saas-retention-benchmarks-for-private-b2b-companies/); [ValueAddVC](https://valueaddvc.com/blog/startup-funding-rounds-in-2025-whats-normal-at-pre-seed-seed-a-and-b) |
| Gross revenue retention | High 80s to low 90s | Mid-to-high 90s for strong companies | [CRV](https://www.crv.com/content/key-performance-indicators) |
| CAC payback | ≈20 months | Under 18 months (SMB) or 24 (enterprise) | [CRV](https://www.crv.com/content/key-performance-indicators) |
| Burn multiple | — | <1.0x exceptional, 1.0–1.5x strong, >3.0x red flag; Series A expected under 2.0x | [CRV](https://www.crv.com/content/key-performance-indicators) |
| Rule of 40 | 25% (2025) | ≥40%, meaningful only above ~$20M ARR | [Aleph](https://getaleph.com/answers/rule-of-40-saas-2026) |
| LTV:CAC | ≈4.1x (Benchmarkit) | ≥3x floor | [Data-Mania](https://www.data-mania.com/blog/b2b-saas-benchmarks-2026-annual-report/); [CRV](https://www.crv.com/content/key-performance-indicators) |

These ratios depend on how they are defined. A generator should collect the raw drivers and compute the ratios itself: MRR by month, new, expansion and churned MRR, S&M spend, gross margin and net burn.

### AI companies are judged on revenue quality and margins

AI companies are judged on different curves:

- **Margins:** ICONIQ's July 2026 survey puts **AI product gross margin at 45% in 2025**, projected at 53% for 2026, against 70–80% for classic SaaS ([ICONIQ](https://www.iconiq.com/growth/reports/state-of-ai-2026)).
- **Growth path:** Bessemer's "Shooting Star" benchmark runs about $3M → $12M → $40M → $103M ARR over four years (the "Q2T3" path). It assumes **~60% gross margin and ~$164K ARR per employee** ([Bessemer](https://www.bvp.com/atlas/the-state-of-ai-2025)).
- **Revenue quality:** investors in 2026 push back on "ARR" that is really pilots or annualised usage ([Startup Fortune](https://startupfortune.com/ai-startups-are-making-arr-harder-to-trust/)). CRV says AI retention benchmarks "are not well established" ([CRV](https://www.crv.com/content/key-performance-indicators)).

An AI deck should state its ARR definition. It should split contracted, usage-based, pilot and services revenue, and show the gross-margin path.

### Each sector counts traction in its own unit

| Sector | What investors count as traction | Directional bar |
|---|---|---|
| Fintech | TPV, **net** take rate, contribution margin, loss or fraud rates by vintage, licence or sponsor bank ([Mostly Metrics](https://www.mostlymetrics.com/p/the-top-metrics-for-fintech-companies)) | Payments net take ≈0.1–0.5%, lending 1–5%, fraud under 0.1% of TPV (vendor estimates, [DDR](https://ddr.bio/due-diligence/fintech-startup/series-a-stage)) |
| Marketplace | GMV, take rate, liquidity (match rate, time to match), cohort repeat; GMV is not revenue ([a16z](https://a16z.com/the-marketplace-glossary/)) | Take rate from low single digits to the mid-30s |
| Consumer app | DAU/WAU trend and cohort retention ([CRV](https://www.crv.com/content/key-performance-indicators)) | 6-month retention, good/great: social 25%/45%, transactional 30%/50%, consumer SaaS 40%/70% ([Lenny Rachitsky](https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29)) |
| D2C | Contribution margin after marketing, LTV:CAC, repeat rate | Median contribution margin ≈22% in 2025; LTV:CAC ≥3 (vendor, [Commerce Catalyst](https://commercecatalyst.ai/benchmarks/)) |
| Deeptech / climate | Technology readiness level (TRL), IP, grants, signed offtakes, first-of-a-kind plant path | TRL 2–3 at seed and about 5 at Series A ([Impact VC](https://impactvc.substack.com/p/investing-in-hardware-interview-with)); contracts with money attached rather than LOIs ([Tech Nation](https://technation.io/how-to-scale-climate-tech-hardware-startup/)) |
| Healthtech | Regulatory pathway, reimbursement code, clinical evidence ([VC Sheet](https://vcsheet.com/sheet/digital-health-funds)) | Peer-reviewed outcomes are now baseline; US median deal $14M in H1 2026 ([Healthcare Dive](https://healthcaredive.com/news/digital-health-funding-first-half-2026-rock-health/825215/)) |
| Enterprise | Paid pilots converting to contracts, named logos, recent LOIs | An LOI signed about 2 months ago and converting in 1–3 months beats an older one ([Hustle Fund](https://www.hustlefund.vc/post/angel-squad-how-to-leverage-customer-traction-to-attract-angel-investors)) |

### Pre-revenue companies substitute committed demand for revenue

CRV ranks committed demand above expressed interest. **LOIs are strongest "when they carry dollar figures"**, design partners should be "testing weekly builds", paid pilots and pre-orders count, and a waitlist from "one tweet shows little" ([CRV](https://www.crv.com/content/startup-traction)).

### Projections and the ask

**Projections** should be driver-based:

- **Horizon:** three years at seed, three to five at Series A and later.
- **Build:** customers × contract value × retention, not a share of a big market ([TechCrunch](https://techcrunch.com/2023/04/10/build-a-bottom-up-financial-model-to-show-potential-investors-youre-serious); [Deckary](https://deckary.com/blog/financial-projections-slide)).

**The ask** should state:

- the amount
- the instrument
- use of funds in three to five buckets, each tied to a dated milestone
- the runway the money buys (18–24 months or more)

The milestones should equal the next round's bar. CRV frames it "around the next risk you will remove instead of the months you want to survive" ([CRV](https://www.crv.com/content/seed-pitch-deck)). Guides disagree on whether to print a valuation cap in an emailed deck ([PitchDeckGuide](https://pitchdeckguide.com/pitch-deck-ask-slide/)).

## Credibility, not polish, wins the second meeting

### Reading time is short and getting shorter

- DocSend measured an **all-time low of 2 minutes 24 seconds per deck** in Q4 2023 ([PR Newswire](https://www.prnewswire.com/news-releases/docsend-2023-year-end-data-indicates-positive-fundraising-momentum-going-into-2024-302036345.html)).
- Papermark's 2024–2026 data shows 4.0 minutes per view. **16% of views end within 10 seconds**, and the team slide is the most-read page ([Papermark](https://www.papermark.com/fundraising-report)).
- All of this data comes from deck-sharing vendors, and DocSend's public tracker may have stopped updating after September 2024.

The direction is clear even with those caveats: the cover and the first three or four slides have to carry the whole thesis.

### Design rules are hygiene

The design guidance is consistent but rarely decisive:

- **Hale (YC):** "Make it legible. Make it simple. Make it obvious." Key text goes at the top, one idea per slide, and the takeaway is written on every chart so the viewer "barely ha[s] to look at the graph" ([YC](https://www.ycombinator.com/blog/how-to-design-a-better-pitch-deck)).
- **Duarte:** a slide's point should register within **three seconds** ([Duarte](https://www.duarte.com/resources/guides-tools/the-glance-test/)).
- **Consulting convention:** "action titles" state the conclusion as a full sentence of 15 words or fewer, so the titles alone tell the story ([Deckary](https://deckary.com/blog/consulting-quality-slides)).
- **Limits:** no rigorous study links font, palette or imagery to funding outcomes. One VC notes "it's rarely the technical or visual flaws that stand out" ([Vestbee](https://vestbee.com/insights/articles/most-common-pitch-deck-mistakes-according-to-v-cs)).

### Substance is where decks fail

The named red flags are substantive:

- **"No competitors."** "An absolute red flag" (Henrik Neninger) that "only highlight[s] a lack of homework" (Filip Bogdziun).
- **Generic market sizing.** "Generic Venn diagrams and random TAM/SAM/SOM numbers" ([Vestbee](https://vestbee.com/insights/articles/most-common-pitch-deck-mistakes-according-to-v-cs)).
- **Unsourced figures.** Practitioners boil this down to one rule: **"If you cannot name the research firm, remove the number"** ([Pitch Deck Guide](https://pitchdeckguide.com/tam-sam-som-pitch-deck/)).
- **Exaggeration.** YC calls exaggerations "fatal errors" ([YC](https://www.ycombinator.com/blog/guide-to-demo-day-pitches/)), and CRV lists "buzzword soup and undefended AI claims" ([CRV](https://www.crv.com/content/seed-pitch-deck)).

Hallucination is a live risk for any AI generator. Axios showed ChatGPT inventing a detailed "investor deck" for Wealthfront's confidential IPO filing, complete with metrics and bankers ([Axios](https://www.axios.com/pro/fintech-deals/2025/07/02/chatgpt-hallucinations-wealthfront-ipo)).

### AI-made decks carry a stigma

The 2026 commentary objects to sameness and outsourced thinking, not to AI itself:

- **Leslie Feinzaig** (Fast Company, August 2026) says AI-built decks share the same slides, social-media phrasing and **fragment slide titles**: "when you build your deck with AI, you sound exactly like everyone else." She also says the goal "is not to be comprehensive, it's to be compelling" ([Fast Company mirror](https://fastcompanyme.com/?p=98594)).
- **Searchfunder investors** warn that founders get the stigma "even if your deck just *looks* AI-generated" ([Searchfunder](https://searchfunder.com/post/investor-perspective-ai-generated-pitch-decks-really-hurt-your-credibility)).
- **Brian Kerns** calls outsourcing critical thinking a "100% fail" and expects investors to ask founders to disclose AI use ([VentureWell](https://venturewell.org/blog/pitch-decks-artificial-intelligence-ai/)).

An AI deck tool's positioning therefore has to be "AI-assisted, founder-authored". It should force founder-specific inputs and refuse generic fill.

### Delivery

- Send a compressed PDF, ideally about 3 MB. **"If I see 8mb or more, then there is a problem"**, says VC Alexander Jarvis, who also dislikes email gates ([Alexander Jarvis](https://www.alexanderjarvis.com/whats-a-good-file-size-for-sending-a-pitch-deck-around/)).
- Decks are read over weeks: the median is 7.9 hours to first open and **six months from first view to an announced round** ([Papermark](https://www.papermark.com/fundraising-report)).

## Indian investors want rupees, profitability and compliance

### Indian rounds are about a third the size of US rounds

- **Market size:** India VC reached about **$16B across more than 1,300 deals in 2025**, per Bain-IVCA ([The Tribune](https://www.tribuneindia.com/news/business/fintech-saas-drive-indias-vc-investments-to-16-bn-in-2025-log-second-straight-year-of-growth-bain-report/)). Tracxn's narrower tech-startup count was $10.5B, down 17%, with seed funding down 30% ([People Matters](https://www.peoplematters.in/news/funding-and-investment/tech-startup-funding-falls-17percent-to-dollar105-billion-in-2025-report-47773)).
- **Median rounds:** FinVal's analysis of 890 Tracxn deals from January to August 2026 gives the medians below. Only 39% of those deals disclosed a valuation ([FinVal Research](https://finvalresearch.in/india-startup-funding-report-2026/)).

| Stage | Median round (Jan–Aug 2026) | Approx. USD |
|---|---|---|
| Seed | ₹8.0 Cr (middle half ₹2.4–19 Cr) | ~$0.8M |
| Series A | ₹50.8 Cr | ~$5.3M |
| Series B | ₹123.8 Cr | ~$13M |

- **Series A bar:** Peak XV's Rajan Anandan says "the bar to raise a Series A has gone up pretty significantly." Peak XV also raised its Surge seed cheque ceiling from $3M to $5M ([TechCrunch](https://techcrunch.com/2026/09/28/peak-xv-goes-bigger-at-seed-with-new-surge-cohort-as-series-a-bar-rises/)).

Bain calls 2026 a "monetization-led phase" that prioritises profitability, unit economics and cash-flow visibility ([Asianet Newsable](https://newsable.asianetnews.com/business/indias-vc-landscape-to-shift-to-monetization-profitability-by-2026-articleshow-gqgt3n1)). **US round sizes and SaaS benchmarks are miscalibrated for an Indian raise.**

### What an Indian deck must show

**Structure and projections.** Indian guidance converges on a 10–12-slide core. Projections must state CAC, pricing, conversion, churn, burn, runway and the path to profitability. A vague ask such as "We are raising Rs 2 to 3 crore" reads as weak ([YourStory](https://yourstory.com/2026/01/pitch-deck-playbook-get-funded)). Angels also weigh exit potential ([TheCEO.in](https://www.theceo.in/blogs/fundraising-101-pitch-startup-angel-investors-india)).

**Financial checks.** Revenue is reconciled against GST returns, MCA filings and bank statements, so decks should say whether figures are net of GST. Practitioners cite positive contribution margin and **CAC payback within 12–18 months** as pre-term-sheet checks ([Legal Suvidha](https://legalsuvidha.com/blog/crafting-pitch-deck-for-startup); [Legal Suvidha](https://legalsuvidha.com/blog/15-things-vcs-look-for-in-your-company)).

**Market sizing.** Blume's Indus Valley 2025 report puts India's real consuming class at **about 140 million people, roughly 10% of the population** ([Scroll](https://scroll.in/latest/1079648/scroll_in)). A "1.4 billion Indians" TAM is therefore a red flag. UPI's 24.51 billion transactions in August 2026 give a credible anchor for distribution and market sizing ([StartupTalky](https://startuptalky.com/india-upi-transactions-august-2026-record-volume/)).

**Notation.** Indian reports quote domestic figures as **₹ Cr with USD in brackets** (FinVal's "₹8.0 Cr (~US$0.8M)") and quote headline fund flows in USD. FinVal's 2026 conversions imply about ₹95 to the dollar, so a deck should carry a dated FX rate rather than a hard-coded one.

### Regulation has changed since 2024

- **Angel tax** was abolished for all investor classes in July 2024, so "Section 56 exemption" slides are obsolete ([Inc42](https://inc42.com/buzz/budget-2024-25-fm-nirmala-sitharaman-abolishes-angel-tax)).
- **SEBI angel funds** may now invest ₹10 lakh to ₹25 Cr per startup, from accredited investors only ([Taxscan](https://www.taxscan.in/top-stories/sebi-revises-angel-fund-regulations-accredited-investors-made-mandatory-investment-capped-at-rs-25-crore-1432381)).
- **DPDP Rules** were notified in November 2025, with core obligations from about May 2027 ([SS Rana](https://ssrana.in/articles/meity-notifies-final-digital-personal-data-protection-rules-2025/)).
- **RBI payment aggregators** need ₹15 Cr net worth at application and ₹25 Cr by year three ([Outlook Business](https://www.outlookbusiness.com/news/rbi-issues-new-master-directions-for-payment-aggregators-rules-take-effect-immediately)). That directly shapes a fintech's use of funds.
- **Domicile:** US funds generally wire money only into a Delaware C-corp ([eChai Ventures](https://echai.ventures/startingup/raise-or-not/should-i-raise-from-indian-vcs-or-try-to-get-a-us-or-global-fund-on-my-cap-table)). Reverse flips by Razorpay, Zepto and Groww, the last at a reported ₹1,340 Cr tax cost, make India domicile a credible story ([Outlook Business](https://www.outlookbusiness.com/start-up/zeptos-homecoming-gets-nclt-nod-how-indian-start-ups-reverse-flipping-concept-work)).

### Government programmes have their own pitch formats

- **Startup India Seed Fund Scheme:** runs through incubators that hold a **pitch-deck presentation plus Q&A**. It offers grants up to ₹20 lakh and debt up to ₹50 lakh ([TaxGuru](https://taxguru.in/?p=1040488)).
- **Fund of Funds 2.0:** ₹10,000 Cr invested through AIFs only, prioritising deep tech ([Drishti IAS](https://www.drishtiias.com/daily-updates/daily-news-analysis/government-notifies-startup-india-fof-20/print_manually)).
- **Karnataka's ELEVATE:** grants up to ₹50 lakh without taking equity ([YourStory](https://yourstory.com/2026/01/karnataka-startup-policy-rs-571-cr-outlay-targets-deeptech-growth-beyond-bengaluru)).
- **Shark Tank India:** about 90% of its pitches were consumer brands. It popularised the "₹X for Y% equity" ask ([Redseer](https://redseer.com/articles/shark-tank-india-a-win-win-for-startups-and-investors/)), which makes showing the implied valuation useful for Indian angels.

### A recommended audience switch

These norms imply a switch with two settings:

| Setting | India investors | US / global investors |
|---|---|---|
| Currency | ₹ lakh / crore primary, USD in brackets, dated FX | USD millions |
| Period | Indian financial year (April–March), labelled e.g. "FY26" | Calendar year |
| Metric emphasis | Contribution margin, burn, runway, months to breakeven | ARR growth, NRR, burn multiple |
| Market sizing | Consuming-class tiers, bottom-up | Global TAM by customer profile and geography |
| Compliance slide | DPIIT, entity type, FEMA instruments, DPDP, sector licences, GST | Delaware parent, Indian subsidiary, IP assignment |
| Exit framing | Indian IPO or strategic sale | US M&A or Nasdaq |
| Round benchmarks | FinVal / Tracxn medians | Carta / PitchBook medians |

## Generic generation is becoming a commodity; verification is the open lane

### Large platforms are absorbing the category

- **Gamma** leads horizontal deck generation. It passed **$100M ARR**, raised at a **$2.1B valuation** in November 2025 and says it is profitable ([BusinessWire](https://www.businesswire.com/news/home/20251110805751/en)).
- **Google** shipped full-deck generation in Slides in June 2026 ([Google Workspace](https://workspaceupdates.googleblog.com/2026/06/create-fully-native-and-editable-presentations-with-Gemini-in-Google-Slides.html)).
- **OpenAI** acquired the deck startup NextSlide ([Implicator](https://www.implicator.ai/openai-acquires-nextslide-discloses-deal-months-late/)).
- **Claude and ChatGPT** both output editable .pptx files ([Plus AI](https://plusai.com/blog/chatgpt-vs-claude-for-powerpoint)).
- **Tome** shows that users alone do not save a generic generator. It passed 20M users and still shut its deck product in April 2025 ([ChatSlide](https://www.chatslide.ai/articles/tome-ai-shut-down-what-happened)).

### Fundraising specialists are thin

- **Slidebean** sells templates, AI reviews and an investor finder without contact details ([Slidebean](https://slidebean.com/pricing)).
- **PitchBob** sells an 11-criteria "VC-grade" score and has a 2.6/5 Product Hunt rating from seven reviews ([PitchBob](https://pitchbob.io/products/vc); [Product Hunt](https://www.producthunt.com/products/pitchbob-io/reviews?page=2)).
- No deck-scoring tool has published validation against real investor decisions ([TopAI.tools](https://topai.tools/s/pitch-deck-scoring)).
- Gamma's agent cites uploaded documents only "where possible" ([Gamma Help](https://help.gamma.app/en/articles/15002203-how-do-i-create-with-agent)). A competitor reports its web citations "weren't traceable to real articles" ([PageOn](https://www.pageon.ai/blog/gamma-vs-pageon)).

| Player | Position | Price | Pitch-relevant strength | Weakness |
|---|---|---|---|---|
| Gamma | Horizontal leader | Plus ≈$8–12, Pro ≈$15–25 a month (third-party, [eesel](https://www.eesel.ai/en/blog/gamma-pricing)) | Agent web research | PPTX export breaks layouts ([eesel](https://www.eesel.ai/en/blog/gamma-reviews)); disputed citations |
| Gemini in Slides, Copilot, Canva | Bundled into existing suites | Canva Pro ≈₹4,000 a year ([Dhanam](https://english.dhanamonline.com/news/canva-hikes-global-subscription-prices-by-300-what-does-It-mean-for-indian-users-6949199)) | Already paid for | Grounded in the user's own files, not market data |
| ChatGPT, Claude, Genspark | General agents | Subscriptions / credits | Research plus .pptx in one prompt | "Neither produced a slide deck they'd present without cleanup," per a competing vendor ([Plus AI](https://plusai.com/blog/chatgpt-vs-claude-for-powerpoint)) |
| Slidebean | Founder specialist | $7 Starter, $99 Accelerate | Pitch templates, AI reviews, forecast tool | The founder supplies the substance |
| PitchBob | Scoring specialist | ≈$20–99 (listings conflict) | VC-style rubric | Unvalidated score, poor reviews |
| Presentations.ai | Bengaluru, horizontal | — | $3M Accel seed ([TechCrunch](https://techcrunch.com/2025/02/03/accel-backs-indian-ai-startup-building-chatgpt-for-presentations)) | Not pitch-specific |
| DocSend, Visible | Sharing and investor relations | DocSend $10–300 a month ([DocSend](https://www.docsend.com/pricing/)) | Analytics, data rooms, investor CRM | No generation |

### Where the gap is

No competitor documents claim-level source auditing, bottom-up market sizing with visible inputs, stage- and sector-aware structure, or India-native formats. That claim rests on absence from search results, not confirmed absence.

iPreneur's research pass, anti-fabrication rules and auditor point straight at this gap. The price does not. **Pro at $29 a month sits above Gamma Plus and Beautiful.ai Pro ($14.50 a month, [Beautiful.ai](https://www.beautiful.ai/pricing)).** It is quoted in USD even though it is billed through an Indian payment gateway.

## The investor deck falls short on length, sourcing, stage and locale

### What iPreneur already gets right

Some of iPreneur's choices are ahead of the field:

- The executive-summary slide matches Hoffman's advice to open with the investment thesis.
- The anti-fabrication rules for people, customers, certifications and cap tables match investor expectations.
- A risks slide exists.
- The presenter and standalone modifiers mirror the presentation versus send-ahead split.
- The uncommitted Appendix deck type already builds profile-driven evidence slides.
- The auditor's LTV:CAC < 3 and CAC payback > 18-month checks already encode CRV-grade benchmarks.

The shortfalls cluster in four places:

- how long the main narrative runs
- how numbers are sourced
- how little stage and sector change the deck
- the USD-only, US-shaped default

### Gaps and fixes

| # | Parameter (what investors expect) | iPreneur today | Change |
|---|---|---|---|
| 1 | Core of about 12–18 slides, appendix separate | 24 one-slide sections in one narrative; 9 of 14 types fall below the team's own 20-slide floor ([registry.py](../ipreneur/backend/app/decks/registry.py#L107)) | Make Investor a 14–16-slide core plus a profile-driven appendix (the A1–A20 machinery exists), 20–28 slides in total. Derive a 10–12-slide presenting cut and a 5–7-slide Demo Day cut from the same content. Count the appendix toward the 20–30 target. |
| 2 | A why-now slide (Sequoia, DocSend, Feinzaig) | No section key exists | Add `whyNow` through an existing renderer so every theme still renders it. Rule: name dated, specific enabling changes and fail generic "market is growing" text. |
| 3 | Go-to-market = how you win the first customers, with named channels | Investor, general, business and master decks reuse the partnership "Go-to-Market Together" section, whose rule is "Each phase names the joint activity and which side owns it" ([sections.py:465-471](../ipreneur/backend/app/decks/sections.py#L465)) | Split it into an investor `gtm` (channels, CAC by channel, a first-100-customers plan) and a partnership `jointGtm`. |
| 4 | Fewer, denser slides; no gallery, moat or cap-table slides in the core | Gallery, techIp, moat, segmentation, persona, story and capTable each take a core slot | Fold moat into competition, story into team, and persona into problem. Move the gallery (for read-alone decks), techIp, segmentation and capTable to the appendix. |
| 5 | Bottom-up market sizing; "name the research firm or remove the number" | Figures are mandatory "never blank … estimate"; `MarketPoint` is only `{v, l}` with no source; the research example is top-down ([sections.py:87-97, 266-278](../ipreneur/backend/app/decks/sections.py#L266)) | Add source, year, method and confidence fields. Require customers × ARPU arithmetic. Allow "founder estimate" or "[source needed]" instead of inventing. In India mode, block population-based TAMs. |
| 6 | Investors check sources, and invented ones end deals | The whole research block is labelled "(HIGH CONFIDENCE — use this directly)" ([master_agent.py:884](../ipreneur/backend/app/agents/master/master_agent.py#L884)); sources are stripped from the generation prompt and research is cut to 6,000 characters | Pass per-item confidence and source IDs into generation. Render a footnote per number and a sources slide (A20 exists). Flag sources older than about two years. |
| 7 | Driver-based projections with assumptions; base and downside cases | Legacy rule `Year N MRR = X * (1+G)^(12N)` compounds monthly growth for up to 36 months, against the prompt's own "never extrapolate"; financials are one chart and four KPIs, with FY24–FY27 hard-coded in the example ([sections.py:277](../ipreneur/backend/app/decks/sections.py#L277)) | Compute 3-year (seed) or 3–5-year (Series A and later) views from customers, ARPU, churn, CAC and burn. Show runway and burn multiple. Flag curves above Bessemer's top bands. |
| 8 | Ask = amount, instrument, runway, dated milestones; in India, implied valuation | Headline plus at most four `{label, %}` items; skeleton "Raising $XM Series A"; instrument, valuation, runway and milestones exist in the profile but have no slot on the slide | Extend `AskSection` (renderer and PPTX too). Make the skeleton stage-aware. Have the auditor compare the slide to `ask_amount_usd`. Add an optional valuation toggle. |
| 9 | Stage-specific bars and structure | Pre-seed through growth get the identical 24 slides; stage emphasis is injected only for the investor type ([prompt.py:89](../ipreneur/backend/app/decks/prompt.py#L89)); `pre_seed` counts as pre-revenue in relevance but still gets traction, unit-economics and financials slides | Give each stage its own sequence from one shared stage module. Add a `validation` section for pre-revenue companies: dollar-valued, dated LOIs, paid pilots and named design partners. Feed the stage benchmark table into the auditor as context, not as a score. |
| 10 | Sector-specific traction units | Business model is collected but only affects branding; KPI skeletons are ARR, MoM, NRR and LTV:CAC | Add KPI packs keyed off `business_model`: GMV and take rate; TPV, net take and loss rates; contribution margin; TRL; regulatory pathway; AI gross margin plus a stated ARR definition. |
| 11 | Lead with the strongest proof | One fixed order | Choose a balanced, traction-led or team-led profile based on what the founder actually supplied. |
| 12 | Full-sentence action titles of 15 words or fewer; captioned, non-cumulative charts | Every section has a `headline` field, but most investor skeletons leave it as `"..."`. Only the decision-memo and vision sections demand a stated claim. The traction subtitle example is the topic label "ARR growth ($M)" ([sections.py:336](../ipreneur/backend/app/decks/sections.py#L336)) | Add a headline rule and a "titles alone tell the story" check to every section. Require chart takeaways. |
| 13 | Honest competition including the status quo; no rigged charts | Boolean feature matrix only; "This company (index 0) should win most rows" ([sections.py:340-351](../ipreneur/backend/app/decks/sections.py#L340)) | Require a do-nothing or spreadsheet alternative and allow honest losses. Offer a 2×2 layout. |
| 14 | Team is the most-read slide; founder fit, full-time status, equity | Capped at 4 members; the empty fallback "Details available on request" contradicts the prompt's own ban on "Available upon request" | Add founder-fit, full-time and years-known fields. Replace the fallback with a prompt asking the founder for input. |
| 15 | Audit visible to the founder before an investor sees the deck | The auditor is advisory and stored in `research_summary.audit`, which no frontend reads; it checks only ARR, MRR and revenue against inputs, not customers, NRR, growth or TAM; it cannot parse ₹, Cr or lakh | Show findings per slide in the editor. Extend the cross-checks. Feed errors into a revise pass. |
| 16 | India norms: ₹ Cr, financial year, GST, compliance, profitability, exit | USD-only intake, "$" formatting, no geography field on the form, yet Indian examples throughout the prompts ([master_agent.py:681-711](../ipreneur/backend/app/agents/master/master_agent.py#L681)) | Add the audience switch above, a compliance appendix, contribution-margin and path-to-profitability slides, and presets for the seed-fund scheme, state grants and Shark Tank-style asks. |
| 17 | Avoid AI sameness | AI can suggest only 10 of 40 themes; concrete skeleton values ($2.4M ARR, 500+ customers, 120% NRR, $48B TAM, a 45/30/15/10 split) can leak into output | Let theme suggestion span all 40. Replace example values with typed placeholders. Require a founder insight and origin story as inputs. |
| 18 | Read-alone PDF of 8 MB or less, a teaser, an ungated link | PPTX only; Pro promises a PDF the product does not make; no share link | Add compressed PDF, a teaser or email blurb, a memo export and an ungated share link. Integrate DocSend or Visible rather than rebuilding them. |

### What to fix first

**This sprint: cheap correctness bugs.** These are single-file edits:

- split the `gtm` key
- delete the blanket HIGH CONFIDENCE header
- remove the `(1+G)^(12N)` projection rule
- add a source field to `MarketPoint`
- fix the team fallback text
- widen theme suggestion to all 40 themes
- render the existing audit in the editor

**Next: restructure the investor deck.** Build the core-plus-appendix investor deck, the `whyNow` and `validation` sections, the richer ask, per-stage sequences and ordering profiles. Because themes are tokens over shared renderers, new sections that reuse an existing renderer keep "every template renders every section" intact. Only the extended ask needs renderer and PPTX work. A smaller core also eases a known risk: the deck is emitted twice per response, and the code already treats 20–25-slide decks as candidates for token truncation ([master_agent.py:138-147](../ipreneur/backend/app/agents/master/master_agent.py#L138)).

**Then: build the differentiators.** These are what competitors lack:

- sector KPI packs
- the India audience mode
- benchmark-aware auditing
- PDF and share links
- an INR price point anchored near Canva's ₹4,000 a year rather than Gamma's USD tiers

**Two non-deck issues come first.**

- **Secrets:** the untracked `ipreneur/backend/env.cloudrun.yaml` holds populated Gemini, JWT and S3 secrets. `.gitignore` covers `.env` and `.env.*` but not this filename, so one careless `git add` would commit them.
- **Unauthenticated endpoint:** the legacy `POST /api/v1/pipeline/generate` declares no auth dependency, so it may let anyone trigger crawls and paid Gemini calls. This is inferred: global middleware was not checked ([pipeline.py](../ipreneur/backend/app/api/v1/endpoints/pipeline.py#L25)). When its LLM call fails, it silently emits the generic placeholders its own prompt forbids, as the checked-in `pipeline_output.json` shows.

## Conclusion

**The slide target can be met without breaking the evidence.** The team's 20–30-slide target and the investor data both hold once the appendix is treated as a first-class part of the deck rather than padding. iPreneur's uncommitted Appendix deck type already builds profile-driven evidence slides, so the restructure is mostly re-plumbing.

**The anti-hallucination posture is inverted at the worst place.** It is strict for people and customers. For market sizing it is permissive, mandated and labelled high-confidence, and market sizing is the slide where investors most often catch invented numbers. Turning the existing auditor and confidence tags into visible, per-number provenance would make that weakness the product's headline feature: "every number has a source". Neither Gamma nor the platform bundles can easily copy this, because it depends on fundraising-specific schemas, not slide design.

**The India mode is a calibration fix, not localisation polish.** An Indian Series A median is about ₹51 Cr (~$5.3M), roughly a third of the US figure. Indian investors weigh profitability and compliance over pure growth. A USD, SaaS-shaped default deck is therefore miscalibrated for the market iPreneur bills in.

**The evidence base has limits.** Nearly all reading-behaviour data comes from deck-sharing vendors. No study validates any deck score against funding outcomes. No real `MasterDeckAgent` output was evaluated for this report. iPreneur should present benchmarks as ranges and avoid an "investability score". Its first engineering step should be a small evaluation set of generated decks, scored against the parameters above, so each of these changes can be measured rather than assumed.
