# AriMed - Clinical Professional Platform

## Overview
AriMed is a clinical professional platform for physicians featuring case discussions (Triage), medical news, professional groups, events, an AI assistant (Aribot), and built-in PHI compliance tools.

## Architecture
- **Frontend**: React + TypeScript with Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with in-memory storage (MemStorage)
- **Routing**: wouter (client-side), Express (server-side API)
- **State Management**: TanStack React Query

## Project Structure
```
client/src/
  components/
    app-sidebar.tsx       - Main navigation sidebar
    context-bar.tsx       - Aribot context bar + suggested prompts
    trending-panel.tsx    - Trending topics panel (analytics-powered)
    phi-warning-panel.tsx - PHI detection warnings + posting rules
    ui/                   - shadcn/ui components
  lib/
    analytics.ts          - localStorage-based analytics module
    phi.ts                - PHI detection and redaction heuristics
    queryClient.ts        - TanStack Query client + API helper
  pages/
    home.tsx              - Dashboard with summary cards
    aribot.tsx            - AI assistant with context helper
    triage.tsx            - Clinical case discussions
    triage-detail.tsx     - Individual case with comments
    news.tsx              - Medical news feed
    groups.tsx            - Professional groups
    events.tsx            - Medical events + RSVP
    account.tsx           - User settings + PHI toggle
    team.tsx              - Admin moderation queue
server/
  routes.ts               - API endpoints
  storage.ts              - In-memory storage with seed data
shared/
  schema.ts               - TypeScript types and Zod schemas
```

## Key Features

### Aribot AI Assistant
- **Iframe Limitation**: The Dify chatbot runs in an iframe which prevents direct context injection
- **Context Helper Workaround**: Users copy a structured context block to clipboard and paste it as their first message to Aribot
- **Context Bar**: Shows user profile, specialty, interests with toggles for profile context and PHI-safe mode
- **Suggested Prompts**: 8 specialty-specific prompts generated from the user's profile; clicking copies to clipboard

### Analytics (Local Only)
- All analytics stored in localStorage (key: `ari_analytics`)
- Tracks: page views, triage interactions, news clicks, group joins/leaves, event RSVPs, chat opens
- Trending panel shows: top 10 tags, top 5 specialties, rising topics (delta vs previous period)
- Reset available in Account settings
- Seeded with demo data on first load

### PHI-Safe Heuristics
- Client-side pattern matching for potential PHI: SSN, phone numbers, email, dates, MRN patterns, patient names, addresses
- **Limitations**: Heuristic-only, not a compliance tool; may produce false positives/negatives
- Auto-redact replaces detected spans with [REDACTED]
- Posting requires confirmation checkbox that no identifiers are present
- PHI-safe mode toggle in Account settings and Aribot context bar

### Moderation Queue
- Flagged posts/comments appear in Team admin page
- Actions: Mark safe, Request edit, Remove (demo-only)
- Only visible to admin role users

## API Endpoints
- `GET /api/me` - Current user profile
- `PATCH /api/me` - Update user settings
- `GET/POST /api/triage` - List/create triage cases
- `GET /api/triage/:id` - Case detail with comments
- `POST /api/triage/:id/like` - Toggle like
- `POST /api/triage/:id/flag` - Flag post
- `POST /api/triage/:id/comments` - Add comment
- `POST /api/comments/:id/flag` - Flag comment
- `GET /api/news` - News feed
- `GET /api/groups` - Groups list
- `POST /api/groups/:id/join|leave` - Join/leave group
- `GET /api/events` - Events list
- `POST /api/events/:id/rsvp|unrsvp` - RSVP management
- `GET /api/moderation` - Flagged items
- `PATCH /api/moderation/:id` - Update moderation status

## Running
- `npm run dev` starts both Express backend and Vite frontend dev server
- Demo user: Dr. Sarah Chen (Cardiology, Mass General)
