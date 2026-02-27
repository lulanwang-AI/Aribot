# Aribot Portal - Clinical AI Community Platform

## Overview
Aribot Portal is a doctor-only clinical AI community platform featuring an AI assistant (Aribot), clinical case discussions, medical news, professional groups, events, peer messaging, training modules, and team moderation tools.

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
    app-sidebar.tsx           - Collapsible sidebar with Aribot section
    floating-aribot.tsx       - Floating Aribot widget (bottom-right on non-home pages)
    doctor-profile-sheet.tsx  - LinkedIn-style doctor profile sheet
    doctor-directory.tsx      - Searchable/sortable doctor directory component
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
    home.tsx              - Dashboard with summary cards (/home)
    triage.tsx            - Clinical case discussions with sort
    triage-detail.tsx     - Case detail with nested comments, anonymous posting, likes
    news.tsx              - Medical news with source/specialty filters
    groups.tsx            - Professional groups with type filter, search
    events.tsx            - Medical events with RSVP, capacity display
    doctors.tsx           - Doctor directory page
    chats.tsx             - Peer messaging (thread list + messages)
    training.tsx          - Training modules with completion tracking
    account.tsx           - User profile, settings, sign out
    team.tsx              - Admin moderation queue
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
- `/home` - Dashboard
- `/triage` - Clinical cases (sort: newest/trending/discussed)
- `/triage/:id` - Case detail with nested comments
- `/news` - News feed with filters
- `/groups` - Professional groups
- `/events` - Medical events with RSVP
- `/doctors` - Doctor directory
- `/chats` - Peer messaging
- `/training` - Training modules
- `/account` - Settings & sign out
- `/team` - Moderation queue

## API Endpoints
- `GET/PATCH /api/me` - Current user
- `GET /api/users`, `GET /api/users/:id` - User listing/detail
- `GET /api/doctors?q=&specialty=&sort=ranking` - Doctor search
- `GET/POST /api/triage?sort=` - Cases with sorting
- `GET /api/triage/:id` - Case detail with comments
- `POST /api/triage/:id/like|flag|comments` - Case interactions
- `POST /api/comments/:id/like|flag` - Comment interactions
- `GET /api/news?source=&specialty=&search=` - News with filters
- `GET /api/groups`, `POST /api/groups/:id/join|leave` - Groups
- `GET /api/events`, `POST /api/events/:id/rsvp|unrsvp` - Events
- `GET/POST /api/chats`, `GET/POST /api/chats/:id/messages` - Messaging
- `GET /api/training`, `PATCH /api/training/:id/complete` - Training
- `GET/POST /api/aribot/history` - Chat history
- `GET/POST/PATCH/DELETE /api/aribot/folders` - Folder CRUD
- `GET /api/teams` - Teams
- `GET /api/moderation`, `PATCH /api/moderation/:id` - Moderation

## Key Features
- **Aribot**: Dify iframe chatbot, floating widget on non-home pages
- **Triage**: Nested comments (parentId), anonymous posting, PHI detection, likes
- **News**: Filter by source (NEJM/Lancet/JAMA/BMJ/Nature Medicine) and specialty
- **Groups**: Hospital vs Interest type, search, member avatars
- **Events**: Capacity tracking, attendee avatars, host hospital/group
- **Chats**: Direct + group threads, file attachment indicators
- **Training**: Expandable modules with step completion
- **Doctors**: Searchable directory with ranking scores, verified badges
- **Auth**: Mock login screen, sign out from Account page
- **PHI**: Client-side detection, auto-redact, confirmation checkboxes

## Seed Data (deterministic, seed=42)
- 200 doctors across 14 specialties and 20 hospitals
- 80 news articles from 5 major sources
- 60 triage cases with 3-12 comments each (some nested/anonymous)
- 40 groups (hospital + interest types)
- 30 events over next 90 days
- 25 chat threads with messages
- 12 training modules
- 6 teams

## Running
- `npm run dev` starts Express backend + Vite frontend on port 5000
