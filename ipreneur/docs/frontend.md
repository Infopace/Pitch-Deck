# Frontend Architecture

React 18.3 + TypeScript 5.4 + Vite 5.3 single-page app. The app markets itself as **"Mint"** in its own UI, page titles, and meta tags, even though the repo/package are named `ipreneur-frontend`.

## 1. Stack

| Concern | Library |
|---|---|
| Routing | react-router-dom 6.24 |
| Server data | @tanstack/react-query 5.40 (no Redux-style global data store) |
| Local/auth state | zustand 4.5 (one store — see §3) |
| HTTP | axios 1.7 |
| Forms/validation | react-hook-form 7.52 + zod 3.23 |
| UI primitives | @radix-ui/react-* (dialog, dropdown, progress, select, tabs, toast, tooltip) |
| Icons | lucide-react |
| Animation | motion 13.2 (the Framer Motion successor, imported as `motion/react`) |
| Deck export | pptxgenjs 4.0 + html-to-image 1.11 |
| Drag/drop | react-dnd |
| Auth | @react-oauth/google |

No dedicated component UI kit (no MUI/Chakra/shadcn) — `src/components/ui/*` is hand-rolled on Radix primitives. `recharts` is a listed dependency with no confirmed usage anywhere in the pages/components inspected — likely dead or used only in an untouched corner.

## 2. Routing

`App.tsx`: `BrowserRouter` → `QueryClientProvider` (2-min staleTime, no retry on 401/404) → `ErrorBoundary` → `Suspense`. Every page is lazily loaded (one chunk per route).

| Path | Page | Guard |
|---|---|---|
| `/` | LandingPage | public |
| `/login`, `/register`, `/verify-email` | auth pages | public |
| `/dashboard` | DashboardPage | AuthGuard + DashboardLayout |
| `/projects/new` | NewProjectPage | same |
| `/projects/:projectId` | WorkspacePage | same |
| `/projects/:projectId/editor` | EditorPage | same |
| `/templates` | TemplatesPage | same |
| `/settings` | SettingsPage | same |
| `/billing` | BillingPage | same |
| `*` | NotFoundPage | public |

`AuthGuard` redirects to `/login` when `useIsAuthenticated()` (Zustand selector) is false.

**Page purposes:**
- **LandingPage** — every marketing claim is checked against the code at write time; live deck thumbnails are rendered through the real `renderSlide()` function, not screenshots.
- **NewProjectPage** — multi-step intake form; fetches the deck-type registry from the backend so it only shows fields that type actually needs; handles pre-payment via `useDeckPayment`.
- **WorkspacePage** — polls job status every 3s while generating; shows progress, branding, and the deck preview/export actions.
- **EditorPage** — in-place slide editor with local dirty-tracking and discard.
- **TemplatesPage** — gallery of all 41 themes, rendered live at 1280×720.
- **BillingPage** — lists per-deck-type pricing and the user's credit history; "Create this deck" routes to the generator rather than checking out separately (payment happens at generation time).

## 3. State

Only one Zustand store exists: `src/stores/authStore.ts`. State: `user`, `accessToken`, `isLoading`. Persisted to `localStorage` under key `"ipreneur_auth"` (only `{user, accessToken}`, via `partialize`). `register()` deliberately does not set the token — the account isn't usable until OTP verification completes. `logout()` best-effort POSTs then always clears local state regardless of the server response.

Everything else (projects, jobs, decks) flows through React Query, not through a global store.

## 4. API client (`src/services/api/`)

Single axios instance (`client.ts`):
- Base URL: `VITE_API_URL`, defaulting to `http://localhost:8000/api/v1` in dev; in a production build with the var unset it falls back to same-origin `/api/v1` (never `localhost`, so a misconfigured deploy doesn't silently point every visitor at their own machine).
- Request interceptor attaches `Authorization: Bearer <token>` from the auth store.
- Response interceptor **recursively camelCases every JSON response body** (explicitly skipping `Blob`/`ArrayBuffer`/`Date`/`Map` so file downloads aren't mangled), and clears auth on a 401.
- Because of this camelizer, several shared types carry both snake_case and camelCase variants of the same field — fields the frontend itself sent (echoed back) keep their original spelling; fields the backend/AI produced get camelized.

Modules: `projectsApi` (list/get/create/update/uploadAssets/analyze/getStatus/export/delete), `billingApi` (pricing/credits/order/verify), `deckTypesApi` (list), and a separate `services/razorpay.ts` that lazy-loads the Razorpay checkout script once and resolves a signed payment result.

Only one custom hook exists outside page files: `useDeckPayment` — a React Query mutation that opens a credit order, launches Razorpay checkout, and verifies the result server-side. Polling (job status, project list refresh) is done inline with React Query's `refetchInterval`, not via dedicated hook files.

## 5. The deck-template rendering engine

The largest subsystem in the frontend, under `src/components/workspace/deckTemplates/`:

- **`themes.ts`** (~460 lines) — **41 visual themes** across 4 families. The original 10 are pure recolors of one composition; the newer families add optional layout tokens (cover variant, card style, chrome, density) that change composition, not just color — every added token defaults to the original literal, so old decks never visually shift when the theme file gains features.
- **`deckTypes.ts`** — the frontend's mirror of the backend's deck-type registry: section keys, renderer ids, and `slideOrder()`, which resolves the actual slide sequence for a given deck by preferring the deck's own persisted order (so a generated deck keeps rendering what it was generated with even after the registry later changes), falling back to filtering the registry default by what data is present, then to the full default.
- **`TemplatedDeck.tsx`** (~1490 lines) — the actual slide renderer (`renderSlide(theme, data, index, editCtx, order)`), rendering a fixed 1280×720 stage scaled to fit its container.
- **`DeckWorkspace.tsx`** — the full editor surface: a slide-thumbnail rail plus a scrolling edit canvas, replacing an older one-slide carousel that didn't scale past ~24 slides.
- **`exportDeck.ts`** — pixel-exact PPTX export: re-renders each slide with the exact same `renderSlide()` used for the on-screen preview, rasterizes it to PNG via `html-to-image` at 2× density, drops the image full-bleed onto a 16:9 `pptxgenjs` slide, and overlays invisible clickable rectangles over every link so emails/phone numbers/LinkedIn stay clickable despite the slide being an image underneath. Captures slides concurrently and precomputes font-embed CSS once — a documented perf fix that took a 25-slide export from ~21s to ~1.3s.
- **`editing/`** — inline-edit markers (`editableText`) that render byte-identically to plain text when not in edit mode, a portaled floating text editor, and an immutable path-based updater for deck data.

## 6. Constants & types

`src/constants/index.ts` defines `JOB_STEP_ORDER = ["crawling","extracting","researching","analyzing","generating","rendering","uploading"]` and matching labels — note this list is broader than the 4 step names the live backend pipeline actually emits (`crawling`, `generating`, `rendering`, `uploading`); the extra names are vestigial from the legacy pipeline design and simply never appear.

`src/types/index.ts` defines the shared `User`, `BrandingData`, `ResearchData`, `DeckContent`, `Project` (status union omits `"failed"` — some page code treats `"failed"` as a separate legacy status alongside `"error"`), and `JobProgress` types. Deck-type and slide-section types live separately in `deckTemplates/{deckTypes,types}.ts`, mirroring the backend's pydantic models in `app/decks/sections.py`.

## 7. Known issue — two parallel design-token systems

**(a) `tailwind.config.js`** — a dark palette (`obsidian`, `electric-blue`, `violet #7B2CBF`) used by older surfaces (auth pages, status badges, dashboard/settings) via Tailwind utility classes. `violet`, `border`, and `surface` are each a single flat hex value rather than a 50–950 shade scale — so utility classes like `violet-400`, `border-500`, `surface-700` resolve to nothing. (A separate `brand` 50–950 scale does exist and works normally; it's specifically these three tokens that are flat.)

**(b) `src/index.css`** (~1700 lines) — a second, separate, **light-themed** CSS-custom-property system named "Kiln" ("clay + glass on a deep aurora ground"), with a documented rule: clay = things you touch (buttons, active nav), glass = things that contain (panels, cards), flat = things that inform (text, dividers, charts) — nothing gets both. This backs the hand-rolled `ui/*` kit and newer pages (Workspace, Editor, Branding panel, Billing) via inline `style={{ background: "var(--surface-card)" }}` rather than Tailwind classes.

These two systems are not reconciled — which one a component uses depends on when it was written. Any redesign work should pick one and migrate deliberately rather than adding a third.

## 8. Build/deploy configs present (not all are live)

`vite.config.ts` (dev server, `/api` proxy to `localhost:8010`), `vercel.json`, `wrangler.jsonc` (Cloudflare Pages), and `firebase.json` all exist simultaneously and all build from the same `dist/` output with SPA-fallback routing configured. Only Firebase Hosting is actually live — see [deployment.md](deployment.md) for which configs are current vs. abandoned.
