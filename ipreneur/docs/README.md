# Mint internal documentation

This documentation set describes the iPreneur repository’s product and the implementation found in source. **Mint** is the customer-facing product name; **iPreneur** remains in repository and package names.

## Start here

Read the [Product and Architecture Report](product-and-architecture-report.md) for the product overview, user journeys, system diagram, core data flow, security boundaries, operational characteristics, and known gaps.

## Reference documents

| Document | Use it for |
|---|---|
| [Architecture](architecture/ARCHITECTURE.md) | Component boundaries, request flow, runtime topology, and architecture decisions reflected in code — includes an entity-relationship diagram |
| [API reference](api-reference.md) | Endpoint methods, authentication, request and response behavior |
| [AI pipeline](ai-pipeline.md) | Website crawl, Gemini calls, deck generation, rendering, and legacy pipeline distinction |
| [Data model](data-model.md) | Tables, relationships, JSON fields, schema drift, and database setup |
| [Company profiles](company-profiles.md) | The 924-parameter founder-facts catalogue: per-deck-type relevance, provenance tracking, derived values |
| [Company profiles](company-profiles.md) | Reusable parameter profiles, readiness, and how values feed deck generation |
| [Frontend](frontend.md) | Routes, client state, API handling, workspace/editor, themes, and export |
| [Deployment](deployment.md) | Current hosting topology, CI workflows, and historical deployment configs |
| [Environment variables](environment-variables.md) | Configuration names, purpose, defaults, and known unused settings |
| [Billing](billing.md) | Deck pricing, Razorpay checkout/webhooks, credits, and payment ledger |
| [Security](security.md) | Authentication model, trust boundaries, and remediation items |
| [Testing](testing.md) | Existing checks, test locations, and known coverage gaps |
| [Operations runbook](operations-runbook.md) | Local service startup, generation failure diagnosis, payment checks, and release/recovery notes |

## Documentation conventions

- “Current” means observed in the repository at the review date stated in the relevant report. Recheck live cloud configuration before operational changes.
- Deployment URLs, project identifiers, and secret-bearing manifests are intentionally not reproduced in this index. Consult the deployment guide for the topology; use the cloud console for current runtime values.
- Some docs describe risks or gaps found during inspection. They are not assertions that the fixes have been completed.
- When docs and code disagree, verify the active code path and update the relevant page. In particular, distinguish the live project-generation route from legacy Celery/agent code and distinguish frontend PPTX export from backend rendering.

