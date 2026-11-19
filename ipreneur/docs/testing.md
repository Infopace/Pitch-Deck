# Testing

## Backend

No formal `pytest.ini`/`pyproject.toml` test config was found; tests run as plain `pytest` against files directly under `backend/`. Existing suites (by filename, backend/ root):

| File | Area |
|---|---|
| `test_pipeline.py` | End-to-end generation pipeline |
| `test_crawler.py` | `WebCrawler` (Playwright BFS) |
| `test_renderer_sections.py` | PPTX renderer / layout dispatch |
| `test_deck_registry.py` | `app/decks/registry.py` deck-type definitions |
| `test_deck_registry_frontend_sync.py` | Checks the backend registry and the frontend's mirrored `deckTypes.ts` haven't drifted apart |
| `test_deck_prompt_currency.py` | `app/core/money.py` / currency formatting in generation prompts |
| `test_claims_auditor.py` | The advisory claims-auditor pass |
| `test_appendix.py` | Dynamic appendix section resolution |
| `test_pricing.py` | `app/decks/pricing.py` |
| `test_profile.py`, `test_profile_api.py` | `CompanyProfile` model and `/profiles` endpoints |
| `test_schema_drift.py` | `check_schema_drift()` — guards against the DB falling out of sync with the ORM models |
| `_test_step1.py` … `_test_step5.py` | Underscore-prefixed — ad hoc manual scripts, not part of the pytest-discovered suite (pytest's default discovery pattern is `test_*.py`, not `_test_*.py`) |

Run from `backend/` with the venv active:

```powershell
.\.venv\Scripts\Activate
pytest
```

`test_schema_drift.py` and `test_deck_registry_frontend_sync.py` are worth running after any schema or deck-registry change specifically — they exist to catch the two classes of drift that have caused real incidents in this project (a missing `profile_id` column shipped silently; see [data-model.md](data-model.md)).

## Frontend

`vitest` is configured (`npm run test`, `npm run test:ui`) and `@vitejs/plugin-react` is present, but no `*.test.ts(x)` files were found under `frontend/src/` during this documentation pass — treat frontend automated test coverage as effectively absent today. `npm run type-check` (`tsc --noEmit`) and `npm run lint` are the two checks that do run routinely.

## Manual verification scripts

Several one-off scripts exist at `backend/` root for manual smoke-testing rather than automated CI: `check_analysis_flow.py`, `check_project_creation.py`, `check_thread_exec.py`, `run_generate_deck.py`, `inline_run.py`. These are developer tools, not part of any test suite — useful for reproducing a specific pipeline run locally, not for regression coverage.

## Gaps worth noting

- No test exercises the Razorpay payment flow (order creation, signature verification, webhook handling) end-to-end.
- No test exercises JWT expiry/auth-guard behavior directly.
- No frontend component or integration tests exist despite vitest being wired up.
