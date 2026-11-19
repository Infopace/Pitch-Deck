# Operations and Troubleshooting Runbook

This is a repository-based guide for local development and production diagnosis. It does not replace the cloud provider’s access controls or release checklist. Production resource names and credentials should be read from the approved cloud console/secret manager.

## Local service map

| Service | Local default | Start method |
|---|---|---|
| Frontend | `http://localhost:3000` | `cd frontend; npm run dev` |
| API | `http://localhost:8000` | `uvicorn app.main:app --reload --port 8000` from `backend` |
| API health | `http://localhost:8000/health` | FastAPI route |
| OpenAPI UI | `http://localhost:8000/docs` | Disabled in production |
| PostgreSQL | `localhost:5432` | Local service or Compose |
| Redis / MinIO | `localhost:6379` / `localhost:9000` | Compose; legacy worker support and local object storage |

The frontend `package.json` dev script binds port 3000. The root README and old descriptions mentioning port 3001 are stale. Vite's API proxy config and `VITE_API_URL` should be checked together if browser requests are going to the wrong host.

## Starting locally

1. Copy `backend/.env.example` to `backend/.env` and set local database and Gemini values. Keep real credentials out of git.
2. Install backend requirements and Playwright Chromium; see [project README](../README.md).
3. Start PostgreSQL or configure a supported local database URL. Start the API.
4. Run `npm ci` and `npm run dev` in the frontend directory.
5. Open the frontend, verify `/health`, then sign in and create a test project. A URL is optional; omitting it bypasses the crawler.

Docker Compose can start dependencies and app containers, but it also launches a Celery worker and beat that the live project route does not use. Do not infer production job processing from those containers.

## Generation state

The API creates a `Project` and `Job`, then runs generation in a detached thread. The frontend polls `GET /api/v1/projects/{id}/status`. Current steps: `crawling`, `generating`, `rendering`, `uploading`.

| Symptom | Where to inspect | Likely checks |
|---|---|---|
| Project creation returns 402 | Billing credit and pricing endpoints; `deck_credits` | Confirm correct deck type, successful Razorpay verification, and unused paid credit |
| Job remains queued/running after deploy | Job row and API startup logs | Startup reconciliation marks orphaned work failed; retry after confirming status/error |
| Job errors at crawling | API logs, URL, Playwright install/runtime | Check URL reachability, crawl limits/timeouts, Chromium package/browser version match |
| Job errors at generation | API logs, Gemini configuration/provider status | Check both generation/research keys, model names, quota, timeout, and structured-output parsing |
| Job errors at rendering | Stored deck content, renderer logs | Check section data and renderer support for each section/layout |
| Job completes but file is missing | Presentation row, file URL, storage logs/config | Check S3-compatible endpoint, bucket, credentials, upload response, and local fallback path |
| Browser shows stale/failed auth | Network response, localStorage auth state | JWT expires after six days; 401 clears client auth and requires login |
| Payment shown as not paid | `payments`, `deck_credits`, webhook logs | A credit may be `consumed`; use `payments` to establish a successful payment, not only a status filter |

Never place full JWTs, OTPs, payment signatures, Gemini keys, database URLs, or user deck content in shared logs or tickets.

## Useful health and data checks

- `GET /health` confirms the API process responds; it does not prove database, Gemini, payment, or storage health.
- The API startup path initializes tables and logs schema drift. Read [data model](data-model.md) before applying DDL or changing ORM models.
- For payment reconciliation, prefer the `payments` ledger and consult [billing](billing.md) for the `deck_payment_overview` view.
- For a job failure, correlate `Job.id`, `Project.id`, timestamps, `current_step`, and the application log timeframe. Avoid logging raw generated deck JSON.

## Release and recovery notes

- Current deployment topology and workflows are described in [deployment](deployment.md). Verify the cloud service and latest successful deployment in provider consoles before changing runtime settings.
- API code changes and frontend code changes have different deployment workflows. Frontend builds bake `VITE_API_URL` and the Google client ID at build time.
- A process restart terminates in-flight daemon threads. The next startup marks orphaned queued/running jobs failed; it does not resume them. Product support should ask the user to retry after verifying the previous job state.
- Do not assume a DB restore also restores uploaded presentation objects. Confirm both database and object-storage retention/backup policies with operations.
- Secrets found in committed historical manifests must be treated as exposed: rotate them and move active values into managed secret storage. See [security](security.md).

## Escalation inputs

When handing an incident to engineering, include environment, approximate time and timezone, project/job identifiers, current job step/status, sanitized error message, frontend/API build version, and whether the issue is reproducible. Exclude user secrets and deck contents unless handled through an approved private support process.

