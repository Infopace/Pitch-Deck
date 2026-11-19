# Mint (iPreneur)

Mint is a web product for founders and teams who need a presentation tailored to a specific business audience. A user supplies a company website and/or structured business information, chooses a deck type, and gets an AI-generated, editable-in-app presentation with a PPTX download.

The repository name and package names use **iPreneur**; the product UI and backend application name use **Mint**. They refer to the same product.

## Documentation

Start at [the internal documentation index](docs/README.md). The [product and architecture report](docs/product-and-architecture-report.md) is the overview; focused engineering and operational references are linked from there.

## Local development

Prerequisites: Python 3.11, Node.js/npm, PostgreSQL, and API credentials for Gemini. Playwright also needs its Chromium browser installed. SQLite support is an implementation fallback, not the normal development or production database path. For the simplest local setup, use the Docker Compose file, noting that it starts legacy Celery services which the current product generation route does not use.

Backend (PowerShell, from `ipreneur`):

```powershell
Copy-Item backend/.env.example backend/.env
# Edit backend/.env with local database and Gemini settings.
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
playwright install chromium
uvicorn app.main:app --reload --port 8000
```

Frontend (a second terminal, from `ipreneur`):

```powershell
cd frontend
npm ci
npm run dev
```

The Vite dev server defaults to `http://localhost:3000`; the API defaults to `http://localhost:8000`. Set `VITE_API_URL` if the frontend should call a different API URL. API docs are available at `/docs` outside production.

## Current architecture in one sentence

A React/Vite SPA calls a FastAPI API; FastAPI persists users, projects, jobs, and generated content in PostgreSQL, uses Gemini and a Playwright crawler for generation, renders PPTX files, and stores deck outputs through an S3-compatible storage adapter. In the live request path, generation runs in a daemon thread in the API process; Celery/Redis configuration remains in the repository but is not the production job runner.

## Important operational note

Use the docs as the source of truth for current behavior. Several alternate deployment files, legacy agents, and old README claims remain in the repository. The [deployment guide](docs/deployment.md), [pipeline guide](docs/ai-pipeline.md), and [security review](docs/security.md) distinguish active behavior from legacy configuration. Do not copy secrets from deployment manifests or commit local environment files.

## License

Proprietary. See the organization’s applicable license and customer terms.
