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
  routes.ts               - API endpoints
  storage.ts              - In-memory storage with seed data
  seed.ts                 - Deterministic seed data generator (200 doctors, 80 news, 60 cases, etc.)
shared/
  schema.ts               - TypeScript types and Zod schemas
```

## Routes
- `/` - Aribot AI (Dify iframe)
- `/aribot/history` - Chat history
- `/aribot/folders` - Folder management
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

## Key Features
- **Aribot**: Dify iframe chatbot, floating widget on non-home pages
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
