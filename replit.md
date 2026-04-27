# ARIbots - Clinical AI Community Platform

## Overview
ARIbots is a doctor-only clinical AI community platform featuring an AI assistant (Aribots AI), clinical case discussions, medical news, professional groups, events, peer messaging, training modules, and team moderation tools.

## Architecture
- **Frontend**: React + TypeScript with Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with in-memory storage (MemStorage)
- **Routing**: wouter (client-side), Express (server-side API)
- **State Management**: TanStack React Query
- **Auth**: Mock login (localStorage-based, any credentials accepted)

## Demo User
- Dr. Sarah Chen (u1), Cardiology, MGH, verified physician, ranking score 87

## Project Structure
```
client/src/
  components/
    app-sidebar.tsx           - Collapsible sidebar with Aribot section + notification badges
    floating-aribot.tsx       - Floating Aribot widget (bottom-right on non-home pages)
    doctor-profile-sheet.tsx  - LinkedIn-style doctor profile sheet with avatar images
    doctor-directory.tsx      - Searchable/sortable doctor directory component (full screen)
    trending-panel.tsx        - Trending topics panel (analytics-powered)
    phi-warning-panel.tsx     - PHI detection warnings + posting rules
    context-bar.tsx           - Aribot context bar + suggested prompts
    ui/                       - shadcn/ui components
  lib/
    analytics.ts          - localStorage-based analytics module
    phi.ts                - PHI detection and redaction heuristics
    queryClient.ts        - TanStack Query client + API helper
  pages/
    login.tsx             - Mock auth login screen
    aribot.tsx            - Dify iframe AI assistant (home route /)
    aribot-history.tsx    - Aribot chat history
    aribot-folders.tsx    - Aribot folder management (CRUD)
    home.tsx              - Dashboard with calendar view showing events
    triage.tsx            - Clinical case discussions with sort
    triage-detail.tsx     - Case detail with nested comments (reply at any depth), likes
    news.tsx              - Medical news with likes, comments, source/specialty filters
    groups.tsx            - Professional groups with type filter, clickable to detail
    group-detail.tsx      - Group detail with member list and avatars
    events.tsx            - Medical events with photos, RSVP, capacity display
    doctors.tsx           - Full-screen doctor directory page
    chats.tsx             - Peer messaging (thread list + messages)
    training.tsx          - Training modules with completion tracking
    account.tsx           - User profile, settings, sign out
    team.tsx              - Team members display + moderation queue
    telemed.tsx           - Telemedicine: inquiries, consultations, video call, earnings
server/
  routes.ts               - API endpoints (existing OpenAI-backed clinical features)
  storage.ts              - In-memory storage with seed data
  seed.ts                 - Deterministic seed data generator (200 doctors, 80 news, 60 cases, etc.)
  ari/                    - Ari clinical AI feature (Anthropic Claude + MCP, isolated from OpenAI)
    config.ts             - Loads attached_assets/ari-agent.json (system prompt, MCP servers); throws on startup if missing/malformed
    client.ts             - Singleton Anthropic client; throws on startup if ANTHROPIC_API_KEY missing
    schema.ts             - Zod schema for /api/ari/chat request body
    auth.ts               - Strict requireAriAuth middleware (Passport session required; 401 otherwise)
    routes.ts             - POST /api/ari/chat: SSE-streamed Claude response with MCP tools
shared/
  schema.ts               - TypeScript types and Zod schemas
```

## Routes
- `/` - Aribot AI (Dify iframe)
- `/aribot/history` - Chat history
- `/aribot/folders` - Folder management
- `/pre-charting` - Clinical pre-charting intake form
- `/clinical-chat` - AI clinical consult chat
- `/soap` - SOAP note generator with inline editing
- `/visit-summary` - Patient-facing visit summary with PDF export
- `/home` - Dashboard with calendar
- `/triage` - Clinical cases (sort: newest/trending/discussed)
- `/triage/:id` - Case detail with nested comments
- `/news` - News feed with likes, comments, filters
- `/groups` - Professional groups (clickable)
- `/groups/:id` - Group detail with member list
- `/events` - Medical events with photos, RSVP
- `/doctors` - Full-screen doctor directory
- `/chats` - Peer messaging
- `/training` - Training modules
- `/account` - Settings & sign out
- `/team` - Team members + moderation queue
- `/telemed` - Telemedicine (inquiries, my consultations, video call, earnings)

## API Endpoints
- `GET/PATCH /api/me` - Current user
- `GET /api/users`, `GET /api/users/:id` - User listing/detail
- `GET /api/doctors?q=&specialty=&sort=ranking` - Doctor search
- `GET/POST /api/triage?sort=` - Cases with sorting
- `GET /api/triage/:id` - Case detail with comments
- `POST /api/triage/:id/like|flag|comments` - Case interactions
- `POST /api/comments/:id/like|flag` - Comment interactions
- `GET /api/news?source=&specialty=&search=` - News with filters
- `GET /api/news/:id` - News detail with comments
- `POST /api/news/:id/like|comments` - News interactions
- `POST /api/news-comments/:id/like` - News comment likes
- `GET /api/groups`, `GET /api/groups/:id` - Groups with member details
- `POST /api/groups/:id/join|leave` - Group membership
- `GET /api/events`, `POST /api/events/:id/rsvp|unrsvp` - Events
- `GET/POST /api/chats`, `GET/POST /api/chats/:id/messages` - Messaging
- `GET /api/training`, `PATCH /api/training/:id/complete` - Training
- `GET/POST /api/aribot/history` - Chat history
- `GET/POST/PATCH/DELETE /api/aribot/folders` - Folder CRUD
- `GET /api/teams` - Teams with enriched member data
- `GET /api/moderation`, `PATCH /api/moderation/:id` - Moderation
- `GET /api/notifications` - Notification counts for sidebar badges
- `GET /api/telemed/consultations?status=&urgency=` - Telemedicine consultations
- `GET /api/telemed/consultations/:id` - Single consultation
- `POST /api/telemed/consultations/:id/accept` - Accept consultation
- `POST /api/telemed/consultations/:id/complete` - Complete with notes/diagnosis
- `PATCH /api/telemed/consultations/:id/notes` - Update notes
- `GET /api/telemed/earnings` - Earnings summary
- `GET /api/telemed/stats` - Dashboard stats
- `POST /api/prechart` - Generate encounter primer from pre-charting data
- `POST /api/clinical-chat` - Clinical AI chat with streaming responses
- `POST /api/soap` - Generate/regenerate SOAP note sections
- `POST /api/summary` - Generate patient-facing visit summary
- `POST /api/ari/chat` - Ari clinical workflows (Claude + MCP, SSE streaming, requires auth)

## Ari Clinical AI (replaces the old Aribots AI/Dify chatbot and the "Agentic Customization" panel)
- Backed by Anthropic Claude (`claude-sonnet-4-6`) with MCP servers (PubMed, bioRxiv, Open Targets, ClinicalTrials, ChEMBL, CMS Coverage, NPI Registry)
- Config loaded at startup from `attached_assets/ari-agent.json` (system prompt + mcp_servers); fails closed if missing or malformed
- Requires `ANTHROPIC_API_KEY` secret; server throws at boot if absent
- Streaming via Server-Sent Events: each Anthropic text delta forwarded as `data: <text>` lines (multi-line deltas split into multiple `data:` lines per the SSE spec), `event: done` on completion, `event: error` with sanitized JSON on failure (no stack traces or keys leaked)
- Auth: real Passport session via `express-session` + `passport-local`. `requireAriAuth` accepts only requests where `req.isAuthenticated()` is true. Login at `POST /api/auth/login`, logout at `POST /api/auth/logout`.
- Dev-only credentials: in development, the LocalStrategy accepts any non-empty email/password and resolves to seed user `u1`. In production, the strategy hard-fails closed and `SESSION_SECRET` is required at startup. Replace with bcrypt-checked credentials before flipping `NODE_ENV=production`.
- Active capabilities (9): antibiotic_stewardship, wound_skin, pharmacy, ventilator, calculators, clinical_protocols, er_triage, cms_billing, rad_onc_imaging — defined once in `shared/ari/capabilities.ts` (the single source of truth) and consumed by both the server (validation + rejection prose) and the client (UI registry, gates, hints, examples)
- Capability rejection: requests with an unknown capability return HTTP 400 with the exact prose `"That capability is not currently active. Available capabilities are: antibiotic_stewardship, wound_skin, pharmacy, ventilator, calculators, clinical_protocols, er_triage, cms_billing, rad_onc_imaging."` (matches the system prompt; checked before Zod so the message isn't masked by enum errors)
- Capability gates (UI-side soft gates; backend always re-validates via the system prompt):
  - `antibiotic_stewardship` requires patient location/facility — the composer auto-detects location keywords in the query to satisfy this gate
  - `wound_skin` requires an image attachment + a checkbox confirming a ruler/known-size reference is in the photo
- Frontend layout (EHR-style, calm neutral grays, no AI flair):
  - `client/src/pages/aribot.tsx` — top bar (Ari/ER mode toggle + Clear) → ER red banner when in ER → desktop sidebar / mobile Select for capability → message list + composer
  - `client/src/components/ari/{TopBar,CapabilitySidebar,MessageList,Composer}.tsx` — focused sub-components
  - `client/src/stores/ariStore.ts` — Zustand session store with sessionStorage persistence (mode, capability, messages, gate flags persisted; raw base64 attachments are NOT persisted)
  - `client/src/lib/ariApi.ts` — fetch + ReadableStream SSE parser (events terminated by blank lines, multi-line `data:` joined with `\n`, deltas concatenated verbatim, supports AbortController)
  - Animations via Framer Motion (fade + 4px slide), prose via react-markdown + remark-gfm (skipped inside ari_* JSON fences which are reserved for the next prompt)
  - Floating quick-access button (`client/src/components/floating-aribot.tsx`) navigates to `/aribot` rather than opening a small drawer (the new layout doesn't fit usefully in 420×640)
  - Keyboard shortcuts: Cmd/Ctrl+Enter sends; Cmd/Ctrl+1-9 switches capability
- Old `aribot-history.tsx`, `aribot-folders.tsx`, the legacy `client/src/components/ari-chat.tsx`, and the `/api/aribot/history` + `/api/aribot/folders` endpoints have been removed.

## Key Features
- **Clinical Workflow**: Four-module clinical encounter system (Pre-charting → AI Consult → SOAP Note → Visit Summary) sharing patient state via Zustand + sessionStorage
- **Ari Clinical AI**: Anthropic Claude + MCP-backed clinical assistant with 9 capabilities, full page at `/aribot` and floating quick-assist drawer on non-home pages
- **Triage**: Nested comments (reply at any depth), anonymous posting, PHI detection, likes
- **News**: Like/comment on articles, filter by source/specialty, journal name shown after title
- **Groups**: Clickable cards to group detail, Hospital vs Interest type, member avatars
- **Events**: Photos per event type, capacity tracking, attendee avatars, event types include Lab/Conference/Meeting/Grand Rounds/Coffee Chat
- **Chats**: Direct + group threads, file attachment indicators
- **Training**: Expandable modules with step completion
- **Doctors**: Full-screen searchable directory with avatar faces, ranking scores, verified badges
- **Dashboard**: Calendar view showing upcoming events
- **Teams**: Populated team members with avatars, rankings, and roles
- **Notifications**: Badge counts on News, Triage, Events, Chats nav items
- **Telemedicine**: Patient inquiry queue, accept/join video calls, simulated call UI, earnings tracking, consultation completion with diagnosis/prescriptions
- **Auth**: Mock login screen, sign out from Account page
- **PHI**: Client-side detection, auto-redact, confirmation checkboxes

## Seed Data (deterministic, seed=42)
- 200 doctors with DiceBear avatar faces across 14 specialties and 24 hospitals
- 80 news articles with likes and comments from 5 major sources
- 60 triage cases with 3-12 comments each (some nested/anonymous)
- 40 groups (hospital + interest types) with member avatars
- 30 events with photos (Lab/Conference/Meeting/Grand Rounds/Coffee Chat types)
- 25 chat threads with messages
- 12 training modules
- 30 telemedicine consultations (mixed statuses, urgencies, complaints)
- 6 teams with enriched member data

## Running
- `npm run dev` starts Express backend + Vite frontend on port 5000
