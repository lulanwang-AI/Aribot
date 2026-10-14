# ARIbots V5 — Project Overview

## AI provider

Anthropic is the only AI provider. All Ari assistant, Clinical Workflow, mobile AI, and EMR AI features use `ANTHROPIC_API_KEY` and the single Claude model setting in `@workspace/clinical-ai`. Managed agent configuration may supply prompts and tools, but does not override that shared model.

Existing response contracts and clinical-chat plain-text streaming are preserved. Deterministic documentation fallbacks apply only when the Anthropic key is missing or a required JSON response is invalid. Provider/network failures are reported as errors rather than silently substituted with templates. Both servers warn at startup when the key is missing.

ARIbots is a doctor-only clinical AI platform. The project ships:

- **`artifacts/aribots-web`** — Vite + React web app (existing, working).
- **`artifacts/api-server`** — Express + Drizzle Postgres API (existing, working). Auth: passport-local with session cookies. Includes Ari endpoints under `/api/ari/*` (Anthropic-backed, SSE streaming, MCP tools).
- **`artifacts/aribots-mobile`** — Expo (React Native, iOS + Android) mobile app, brand-matched to web. New in this build.
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

## Mobile app architecture

`artifacts/aribots-mobile` uses Expo Router (file-based routing) with a tab bar plus stack screens.

Key directories:

- `app/(tabs)/` — Home, Ari (AI chat), Triage (cases), News, More.
- `app/triage/[id].tsx`, `app/news/[id].tsx`, `app/groups/[id].tsx`, `app/chats/[id].tsx` — detail stack screens.
- `app/login.tsx`, `app/groups.tsx`, `app/events.tsx`, `app/chats.tsx`, `app/doctors.tsx`, `app/training.tsx`, `app/telemed.tsx`, `app/pre-charting.tsx`, `app/soap.tsx`, `app/visit-summary.tsx`, `app/clinical-chat.tsx` — secondary screens.
- `components/Brand.tsx` — `BrandMark`, `BrandWordmark`, `ModeGradient` (Ari ↔ ER gradient).
- `components/SimpleList.tsx` — shared list pattern for groups / events / doctors / training / chats.
- `lib/api.ts` — fetch helper with persistent cookie jar (AsyncStorage) since RN doesn't have a native cookie jar. Handles `Set-Cookie` from the API server so session-based endpoints work after login.
- `lib/auth.tsx` — auth context, persists "signed in" flag in AsyncStorage.
- `constants/colors.ts` — palette synced with the web app's `index.css` (primary `#3b82f6`, light/dark surfaces, Ari/ER gradient stops).
- `assets/images/` — brand assets copied from web (`aribot-mark-1024.png`, favicons, logo.svg). `icon.png` is the same mark used for the launch icon.

The mobile app talks to the existing **`artifacts/api-server`** at `https://${EXPO_PUBLIC_DOMAIN}/api/*`. Both web and mobile share one Postgres database and one set of routes, including Ari (`/api/ari/chat` SSE streaming via `expo/fetch`).

## Auth

The mobile login screen calls `POST /api/auth/login`. The API server's dev passport-local fallback accepts any email/password and resolves to seed user `u1`. Cookies are captured from `Set-Cookie` and replayed on subsequent requests via `lib/api.ts`. Ari endpoints (`requireAriClinician`) also fall back to `u1` when no session exists.

## Ari mobile chat

`app/(tabs)/ari.tsx` streams from `POST /api/ari/chat` using `import { fetch } from 'expo/fetch'` (required for `getReader()` on RN). Supports an Ari ↔ ER mode toggle with a brand gradient. Parses SSE `data:` frames as JSON and concatenates `delta`/`text`/`content`/`token` deltas into the streaming bubble.

## Branding parity

- Logo / favicon / mark: copied directly from web.
- Primary blue: `#3b82f6` (matches web HSL `217 91% 60%`).
- Light bg `#ffffff`, dark bg `#0b0e13` (matches web dark surface).
- Typography: Inter (font-loaded via `@expo-google-fonts/inter`, weights 400/500/600/700) — close to the web's Open Sans/Montserrat in feel and well-suited for clinical UI.
- Ari gradient: blue → violet (`#60a5fa → #a78bfa`). ER gradient: rose → orange (`#fb7185 → #f97316`).

## Known infrastructure note (mobile preview)

The Replit workflow runner reports the `artifacts/aribots-mobile: expo` workflow as `failed` with "didn't open port 19512", and the Replit Expo proxy (`*.expo.worf.replit.dev`) gates on workflow state — so the in-IDE web preview for the Expo app may show as unreachable. This is a Replit-side port-detection quirk with this Expo SDK; Metro itself binds and serves correctly (a direct `curl http://localhost:19512/status` returns `200`). Mobile testing via Expo Go (scan QR code from the workflow log) and the production publish path via **Expo Launch** are unaffected.

## Out of scope (per requirements)

- Live telemedicine WebRTC video on mobile. The `app/telemed.tsx` screen shows scheduled visits and notes that live video remains web-only.
