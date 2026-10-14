# ARIbots V5 — Project Overview

## AI provider

Anthropic is the only AI provider. All Ari assistant, Clinical Workflow, mobile AI, and EMR AI features use `ANTHROPIC_API_KEY` and the single Claude model setting in `@workspace/clinical-ai`. Managed agent configuration may supply prompts and tools, but does not override that shared model.

Existing response contracts and clinical-chat plain-text streaming are preserved. Deterministic documentation fallbacks apply only when the Anthropic key is missing or a required JSON response is invalid. Provider/network failures are reported as errors rather than silently substituted with templates. Both servers warn at startup when the key is missing.

ARIbots is a doctor-only clinical AI platform. The project ships:

- **`artifacts/aribots-web`** — Vite + React web app (existing, working).
- **`artifacts/api-server`** — Express + Drizzle Postgres API (existing, working). Auth: passport-local with session cookies. Includes Ari endpoints under `/api/ari/*` (Anthropic-backed, SSE streaming, MCP tools).
- **`artifacts/aribots-mobile`**, **`artifacts/amr-mobile`**, **`artifacts/emr-mobile`** — Expo (React Native, iOS + Android + web export) mobile apps, one per workspace, brand-matched to their web apps. See "Mobile apps" below.
- **`artifacts/mockup-sandbox`** — design canvas sandbox (existing).

## Databases and demo data

All three services share the single Replit Postgres database in `DATABASE_URL`.
The API server (`lib/db`) and the EMR (`artifacts/ari-emr/server/db.ts`) both
use the node-postgres driver, so a local Postgres works for development and
tests as well.

EMR demo data (20 patients, encounters, appointments, billing and CRM records)
is written by `artifacts/ari-emr/server/seed-runner.ts` after the EMR server
starts listening. Each seeder backfills a table only while that table is empty,
and the run is serialized across autoscale instances with a Postgres advisory
lock. In development it always runs. In production it runs only when the EMR
service has `EMR_SEED_DEMO="true"`, which `artifacts/ari-emr/.replit-artifact/artifact.toml`
sets for the demo tenant; remove that line for a deployment that must start
empty. `pnpm --filter @workspace/ari-emr run typecheck:server` typechecks the
EMR server code (it still reports pre-existing errors in `routes.ts` and
`storage.ts`, so it is not yet wired into the workspace typecheck).

## Persistence (API server)

The API server keeps its operational state in Postgres; only the seeded
community demo content (doctors, triage posts, news, groups, events, chats,
training) is still held in memory and rebuilt on start.

| Data | Table | Code |
|---|---|---|
| Sign-in sessions (express-session) | `session` | `artifacts/api-server/src/auth-setup.ts` via connect-pg-simple |
| Antimicrobial stewardship cases | `amr_cases` | `artifacts/api-server/src/amr/case-repository.ts` |
| Website demo requests | `demo_requests` | `artifacts/api-server/src/storage.ts` |
| Ari chat audit trail (query hashes only) | `ari_audit_log` | `artifacts/api-server/src/ari/audit.ts` |
| Ari verified-claim memory (`ARI_MEMORY_ENABLED=true`) | `ari_memory` | `artifacts/api-server/src/ari/memory.ts` |
| EMR demo sign-in sessions | `emr_demo_sessions` | `artifacts/ari-emr/server/demo-auth.ts` |

Both servers create their runtime tables on boot (`lib/db/src/ensure-schema.ts`,
`artifacts/ari-emr/server/ensure-schema.ts`), so a deployment never depends on a
manual `drizzle-kit push`. The stewardship engine (`artifacts/api-server/src/amr/store.ts`)
stays pure and database-free because the standalone web build bundles it into
the browser; the server-side repository applies the same transitions and
persists the result. The eight demonstration stewardship cases are loaded once
into an empty `amr_cases` table; set `AMR_SEED_DEMO=false` on the API service
for a tenant that must start with none.

The two Drizzle configs (`lib/db` and `artifacts/ari-emr`) target the same
database and each carries a `tablesFilter` so a push from one never proposes
dropping the other's tables.

## Public website

The marketing site is a set of pages under `artifacts/aribots-web/src/pages/site/`,
all rendered inside `SiteLayout` (`src/components/site/SiteLayout.tsx`), which
provides the fixed header with a Products menu, the footer with compliance
badges, page metadata and scroll-to-top. The marketing sections that used to
make up the single landing page live in `src/components/site/sections.tsx` and
are composed per page. `src/components/site/ComplianceBadges.tsx` draws the
HIPAA and SOC 2 badges in-house; swap those two components for auditor-issued
artwork if preferred.

| Path | Page | Notes |
|---|---|---|
| `/` (alias `/landing`) | Home | hero, three workspaces, trust strip, Meet Ari, testimonials, community |
| `/platform` | Platform | how the workspaces connect, guarantees, sources |
| `/products/aribots` | ARIbots AI | assistant, physician features, capabilities, community |
| `/products/ari-amr` (aliases `/ari-amr`, `/amr`) | Ari AMR | stewardship product page, dark token theme |
| `/products/ari-emr` | Ari EMR | features, encounter workflow, audiences; "Open" goes to `/ari-emr/` |
| `/mobile` | Mobile apps | per-app status and how to test (Expo Go, web previews) |
| `/security` | Security and compliance | HIPAA and SOC 2, data handling controls, EMR audit records |
| `/about` | About | vision, team, FAQ |
| `/request-demo` | Request a demo | the demo request form with NPI verification |
| `/whitepaper` | Whitepaper | technical white paper, dark reading theme |

Routing lives in `src/App.tsx` (`PUBLIC_PAGES`); every other path requires sign-in.

## Roles

Every account has a `role` on the server (`admin` for the first three seeded
clinicians, including the demo account, otherwise `physician` or `member`).
Admin-only API routes (`/api/moderation`) are gated by `requireRole("admin")`
in `artifacts/api-server/src/auth-setup.ts`. The sidebar role toggle is a view
preference: it can show the observer (student) view to anyone, but the admin
view is offered and honoured only when `/api/me` reports an admin account
(`artifacts/aribots-web/src/lib/role.ts`).

## Demo sign-ins

- Web and API (`POST /api/auth/login`): `demo@aribots.local` / `demo`, or a
  Clerk account when Clerk keys are configured.
- Mobile (`POST /api/mobile/auth/login`, JWT): `demo@aribots.local` or
  `doctor@aribots.local` with password `demo` in every environment;
  development additionally accepts any non-empty credentials.
- EMR (`POST /ari-emr/api/auth/login`): `demo@aribots.local` / `demo`.

## Status endpoints

`GET /api/status` (API server) and `GET /ari-emr/api/status` (EMR) report,
after sign-in, which integrations are configured and whether the database is
reachable, with row counts for the runtime tables. They report presence only,
never a secret value. `GET /api/healthz` and `GET /ari-emr/api/healthz` remain
public liveness checks.

## Mobile apps

Three Expo (React Native) apps, one per workspace, each a workspace package
with its own `.replit-artifact/artifact.toml`. Only `aribots-mobile` is
declared `kind = "mobile"` (the platform allows one per project); the other
two are `kind = "web"` with path routing, which is all their static server
needs:

| App | Package | Published at | Signs in with | Talks to |
| --- | --- | --- | --- | --- |
| ARIbots mobile | `artifacts/aribots-mobile` | `/aribots-mobile/` | `POST /api/mobile/auth/login` (JWT) | `/api/mobile/*` |
| Ari AMR mobile | `artifacts/amr-mobile` | `/amr-mobile/` | `POST /api/mobile/auth/login` (JWT) | `/api/amr/*`, `/api/mobile/ari/chat` |
| Ari EMR mobile | `artifacts/emr-mobile` | `/emr-mobile/` | `POST /ari-emr/api/auth/login` (session token) | `/ari-emr/api/*` |

Each app is built by `scripts/build.js` into `static-build/` and served by
`server/serve.js` (no dependencies). Under the app's path:

- `/<app>/` is the Expo Go landing page: QR code, store links and a link to the
  web build. With an `expo-platform: ios|android` header the same URL returns
  the Expo Go manifest, so the QR code encodes `exps://<host>/<app>/`.
- `/<app>/web/` is the same app exported for the browser
  (`expo export --platform web`, served with an SPA fallback). `app.json`
  sets `experiments.baseUrl` to `/<app>/web` so asset URLs and the router agree.
- `/<app>/status` reports whether the iOS/Android manifests and the web build
  exist in the running deployment.

Dev ports: ARIbots 19512, AMR 19513, EMR 19514 (`.replit` maps them to external
ports 3001 to 3003).

### Testing a mobile app

1. Open `/mobile` on the public site, or go straight to `/<app>/web/` on a
   phone or laptop browser, and sign in with the demo account.
2. For the native build, install Expo Go, open `/<app>/` on the phone and scan
   the QR code (or tap "Open in Expo Go").
3. Demo accounts: ARIbots mobile `doctor@aribots.local` / `demo`; Ari AMR and
   Ari EMR `demo@aribots.local` / `demo`.

Headless checks used before each release live only in the session scratchpad;
the equivalent manual pass is: sign in, open every tab, open a detail screen,
create something (AMR: new case, start therapy, run the review; EMR: Ari
draft, save, sign), confirm it is visible in the web workspace.

### Auth for the mobile apps

- The mobile JWT (`SESSION_SECRET`-signed, issued by the mobile router) is also
  accepted as a bearer token by `requireAuthenticatedWebApi` in
  `artifacts/api-server/src/auth-setup.ts`; it resolves to the demo clinician
  `u1`. That is how the AMR app reaches `/api/amr` without cookies.
- `detachMobileBearer` (same file, mounted in `app.ts` before the Clerk
  middleware) verifies a mobile JWT, keeps its payload on `req.mobileToken`
  and removes the `Authorization` header, so Clerk never tries to verify our
  tokens as its own. Without this every mobile request paid a Clerk round
  trip (3 to 4 seconds when Clerk is unreachable).
- The EMR login returns its session token in the JSON body as well as the
  HttpOnly cookie; `demo-auth.ts` accepts `Authorization: Bearer <token>`.
- On the web builds, API requests go to the page's own origin when
  `EXPO_PUBLIC_DOMAIN` is not set at build time.

### ARIbots mobile (`artifacts/aribots-mobile`)

Expo Router with a tab bar plus stack screens.

- `app/(tabs)/` — Home, Ari (AI chat), Events, More.
- `app/triage/[id].tsx`, `app/news/[id].tsx`, `app/groups/[id].tsx`, `app/chats/[id].tsx` — detail stack screens.
- `app/login.tsx`, `app/groups.tsx`, `app/events.tsx`, `app/chats.tsx`, `app/doctors.tsx`, `app/training.tsx`, `app/telemed.tsx`, `app/pre-charting.tsx`, `app/soap.tsx`, `app/visit-summary.tsx`, `app/clinical-chat.tsx` — secondary screens.
- `components/Brand.tsx` — `BrandMark`, `BrandWordmark`, `ModeGradient` (Ari ↔ ER gradient).
- `lib/api.ts` — JWT in AsyncStorage, `Authorization: Bearer` on every request, SSE streaming for Ari via `expo/fetch`.
- `constants/colors.ts` — palette synced with the web app.

`app/(tabs)/ari.tsx` streams from `POST /api/mobile/ari/chat` (same managed
agent configuration as the web Ask Ari). Live telemedicine video stays web-only.

### Ari AMR mobile (`artifacts/amr-mobile`)

- Tabs: Dashboard (metrics, coverage alerts, reviews due), Cases (worklist
  with filters), Antibiogram (region picker, organism × agent table),
  Formulary (agents by spectrum tier), More (account, Ask Ari, syndrome
  guidance, theme).
- `app/intake.tsx` — the screening intake; previews and creates a case.
- `app/case/[id].tsx` — intake summary, ranked empiric regimens with "Start
  this regimen", the 48 to 72 hour review form (culture result, isolate with
  S/I/R for the current agents, rapid diagnostics, clinical response), the
  targeted recommendation, the clinician decision, notes and the timeline.
- `app/agent/[id].tsx`, `app/syndrome/[id].tsx` — monograph and guidance.
- `app/ari.tsx` — Ask Ari (streams from `/api/mobile/ari/chat`).
- `lib/amr.ts` imports the engine's types from
  `artifacts/api-server/src/amr/types.ts` (type-only, erased at build time).

### Ari EMR mobile (`artifacts/emr-mobile`)

- Tabs: Today (appointments by date, open encounters), Patients, In-basket
  (unread badge, categories, open/done), Ari (chart Q&A, differential, text
  rewriting), More.
- `app/patient/[id].tsx` — summary (vitals, problems, medications,
  allergies), encounters, notes.
- `app/encounter/[id].tsx` — "Draft from the chart" (`/api/ari/draft-note`)
  into an editable SOAP draft, saved as a draft note.
- `app/note/new.tsx` — dictate or type a narrative, "Structure with Ari"
  (`/api/ari/structure-narrative`), save.
- `app/note/[id].tsx` — view, edit, sign, addendums.
- `lib/emr.ts` imports the row types from `artifacts/ari-emr/shared/schema.ts`
  (type-only).

Both new apps share the same small component kit (`components/ui.tsx`) and
differ in `constants/colors.ts`: AMR uses the stewardship workspace's teal
tokens, EMR the EMR's ink-blue tokens.

## Known infrastructure note (mobile preview)

The Replit workflow runner may report an Expo workflow as `failed` with
"didn't open port", and the Replit Expo proxy (`*.expo.worf.replit.dev`)
gates on workflow state, so the in-IDE preview for an Expo app can show as
unreachable in development. Metro itself binds and serves correctly. The
published paths above (`/<app>/`, `/<app>/web/`) do not depend on this.

## Out of scope (per requirements)

- Live telemedicine WebRTC video on mobile. The `app/telemed.tsx` screen shows scheduled visits and notes that live video remains web-only.
