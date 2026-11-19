# Company Profiles — the parameter catalogue

This subsystem (`backend/app/profile/`) is the single largest piece of business logic in the backend by line count (~1,990 lines across 4 files) and wasn't covered by the other docs — it's the engine behind `CompanyProfile` ([data-model.md](data-model.md)) and behind every deck's "ground truth" facts.

## The core idea

A company has one set of facts — its ARR, its founders, its TAM, its competitors — regardless of how many different decks get generated from it. `app/profile/parameters.py` defines a **master catalogue of 924 individual parameters, organized into 49 groups** (e.g. `company_identity`, `founder_and_team`, `unit_economics`, `fundraising`). Each parameter has a name, a label, a type (`text`, `number`, `currency`, `percent`, `select`, `list`, `table`, …), and a help string.

The catalogue is explicitly **generated, not hand-maintained**: `scripts/gen_parameters.py` builds `parameters.py` from a source document (`Pitch Deck Parameters.docx`), and the file's own header warns that hand-edits are overwritten — corrections belong in that generator's own overrides table.

The design principle stated directly in the code: *"Parameters are the raw business data. They should not be tied one-to-one with slides."* One parameter (say, `cac`) can feed slides across many different deck types, and the founder is only ever asked for it once.

## Relevance: which deck type needs which parameter

`app/profile/relevance.py` maps each of the 14 deck types to which of the 49 parameter **groups** it needs, using a five-letter scale:

| Code | Meaning |
|---|---|
| **R** — Required | The deck is materially weaker without it |
| **C** — Conditional | Required only when some condition holds (company stage, business model, …) |
| **O** — Optional | Used if present, never asked for up front |
| **A** — Auto-derived | Computed from other parameters, never asked for at all |
| **N** — Not applicable | This deck type never uses it |

This is declared at the **group** level (49 groups × 14 deck types is a table a person can actually read and maintain) with per-parameter overrides where needed — the code explicitly notes that doing this at the individual-parameter level (924 × 14) would be unmaintainable and "would drift within a week."

Two conditional rules live here rather than being scattered through prompt code:
- **Pre-revenue companies**: revenue parameters (ARR, MRR, growth rate) drop to Conditional, while validation signals (pilots, LOIs, proof-of-concepts, usage numbers) rise to Required — so an idea-stage founder is never pushed to invent a revenue figure that doesn't exist.
- **Go-to-market by stage**: early-stage decks emphasize ICP, positioning, and acquisition hypotheses; growth-stage decks emphasize CAC, LTV, payback period, and cohort data.

This relevance table is also what powers `GET /api/v1/deck-types` and `GET /api/v1/profiles/schema` ([api-reference.md](api-reference.md)) — the mechanism behind "the New Deck form only asks for the fields that deck type actually uses."

## Provenance: every value knows where it came from

`app/profile/values.py` never stores a bare value. Every parameter is a `ParameterValue` carrying:

| Field | Purpose |
|---|---|
| `value` | The actual data |
| `source` | `founder` (typed/confirmed by a human — highest authority), `crawl` (read off the company's website), `research` (found by the AI research pass), or `derived` (computed from other values) |
| `source_url`, `method`, `as_of` | Where it came from, how it was calculated, and as of when |
| `confidence` | 0–1, defaulted by source (`founder`=1.0, `derived`=0.9, `crawl`=0.75, `research`=0.6) |

**Merge rule**: a founder-confirmed value is never silently overwritten by a later website crawl or research pass — "confirm, don't type" is enforced in code (`ProfileValues.merge()`), not just convention. Only another founder-sourced write can change a founder-confirmed value.

**Why this matters for the product**: the Appendix deck type exists specifically as a traceability layer — if the Investor deck's cover slide says "TAM is $5B," the Appendix deck can show the TAM methodology, the assumptions, the customer count, the average spend, and the source, because that provenance was captured at input time rather than thrown away. Storing a bare `{"tam": "5000000000"}` would have made that impossible to reconstruct later.

**Derived parameters** (relevance code `A`) are computed automatically and never asked for: LTV:CAC ratio (from LTV and CAC), ARR (from MRR × 12, if ARR wasn't given directly), and runway (from cash balance ÷ monthly burn).

## Rendering a profile into the AI prompt

`app/profile/prompt.py: render_profile_for_deck()` builds the "COMPANY PROFILE" block injected into the generation prompt ([ai-pipeline.md](ai-pipeline.md)). It does two things a flatter design couldn't:

1. **Emits only the groups the specific deck type consumes** — a Sales deck's prompt isn't padded with cap-table rows the model would just have to ignore. On a 924-parameter catalogue, this is the difference between a prompt that fits the model's context and one that doesn't.
2. **Tags every figure with its provenance** in the prompt text itself (e.g. `TAM: $5B [third-party research · RedSeer 2024 report · as of 2026-03-01]`), so the model can attribute claims instead of stating everything in one flat, equally-confident voice.

Required groups are emitted first, so if the 14,000-character cap truncates anything, it's always the optional tail — never the facts the deck is actually built on.

**`profile_gaps_note()`** does the opposite job: it tells the model exactly which required parameters are genuinely unknown, so silence doesn't get filled in with a confident, fabricated number. A named gap produces an honest "not yet available" in the deck instead.

## Completeness tracking

`app/profile/values.py: completeness()` computes, per group and per deck type, how many parameters are filled vs. required — this is what drives the profile UI's progress indicators and the "what's still missing" gate before generation (`GET /api/v1/profiles/{id}/readiness`, [api-reference.md](api-reference.md)). Derived (`A`) parameters never count as a gap, since the founder was never meant to supply them directly.

## Why this exists as a separate layer from `CompanyProfile`

`CompanyProfile.values` (the database column) is just a dict of `{parameter_name: ParameterValue}` — intentionally dumb storage. Everything in this document — what's required for which deck, how values merge, how they're derived, how they're rendered, how completeness is measured — lives in code, not in the database, so the catalogue can evolve (new parameters, new deck types, new relevance rules) without a schema migration. See [data-model.md](data-model.md) for the storage side of this.
