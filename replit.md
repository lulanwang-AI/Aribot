# ARIbots - Clinical AI Community Platform

## Overview
ARIbots is a doctor-only clinical AI community platform designed to integrate an advanced AI assistant (Aribots AI) with a comprehensive suite of clinical community features. Its primary purpose is to facilitate clinical case discussions, disseminate medical news, foster professional networking through groups and events, provide peer messaging, and offer training modules. The platform also includes team moderation tools and a dedicated telemedicine component. The vision is to empower medical professionals with cutting-edge AI tools and a collaborative environment to enhance clinical practice and knowledge sharing.

## User Preferences
Not specified.

## System Architecture
The ARIbots platform employs a modern web architecture, featuring a React + TypeScript frontend built with Vite, styled using Tailwind CSS and shadcn/ui components for a clean, EHR-style UI/UX with calm neutral grays and minimal AI flair. The backend is an Express.js server utilizing in-memory storage (MemStorage) for development and demonstration. Client-side routing is handled by wouter, while server-side API routing is managed by Express. State management is implemented using TanStack React Query. Authentication is currently a mock system based on localStorage, accepting any credentials.

**Key Technical Implementations & Design Choices:**

-   **Clinical Workflow System:** A four-module system (Pre-charting → AI Consult → SOAP Note → Visit Summary) is implemented, sharing patient state via Zustand and sessionStorage.
-   **Ari Clinical AI:** This is the core AI assistant, backed by Anthropic Claude (claude-sonnet-4-6) and integrated with multiple MCP (Medical Content Provider) servers including PubMed, bioRxiv, Open Targets, ClinicalTrials, ChEMBL, CMS Coverage, and NPI Registry. It supports 9 distinct clinical capabilities.
    -   Configuration is loaded from `attached_assets/ari-agent.json` at startup, containing the system prompt and MCP server details.
    -   Streaming responses are delivered via Server-Sent Events (SSE).
    -   Authentication for Ari AI features uses real Passport sessions (`express-session` + `passport-local`).
    -   Capability gating and validation are implemented both on the client-side for UI nudges and robustly on the backend. Capabilities are fully optional — when none is selected, the chat shows an "Auto-detect" pill and the backend omits the `capability` field from the model payload, letting Ari infer the closest capability from the query per the system prompt.
    -   **Chat history persistence:** Past Aribots conversations are persisted to `localStorage` (Zustand `persist`, key `ari-session`, version 4) and survive page reloads. A History panel (right-side Sheet) in the top bar lists every past chat sorted by recency with open/rename/delete and a confirm-gated "Clear all". History is capped at 100 chats; older ones are pruned on save. A one-shot bridge migrates any legacy `sessionStorage` payload into `localStorage` on first load. `updatedAt` is bumped on `addMessage` only (not on every streaming chunk) to avoid persist churn during long replies.
    -   **Voice (ElevenLabs):** Voice input and output are wired through the Replit ElevenLabs connector via `@replit/connectors-sdk` (no API key handling on our side). `POST /api/ari/voice/tts` returns an `audio/mpeg` MP3 from ElevenLabs `eleven_turbo_v2_5` (default voice `21m00Tcm4TlvDq8ikWAM`/Rachel; capped at 4000 chars). `POST /api/ari/voice/stt` accepts a multipart audio upload (≤25 MB) and forwards to ElevenLabs Scribe (`scribe_v1`) returning `{ text }`. The Composer has a "Speak" mic button (uses `MediaRecorder` → opus webm) and the assistant message footer has a "Listen" button (single global playback handle). Helpers live in `client/src/lib/ariVoice.ts`.
    -   ER (Emergency Room) mode provides a visually distinct and functionally streamlined interface for urgent cases.
    -   **Ari Clinical Hardening:** Includes block parsing and rendering for structured AI responses (`ari_section`, `ari_claim`, `ari_step`, `ari_citation`), file upload capabilities (JPEG/PNG/WEBP/GIF/PDF/text with PDF parsing), gate UI nudges (e.g., location input, wound measurement checkbox), ER mode separation with distinct UI elements, and an opt-in memory store (`DrizzleMemoryStore`) for verified clinical claims with PHI redaction.
    -   **Security & Compliance:** User authentication includes license verification, acceptance of Ari terms, and comprehensive audit logging for all AI interactions and access attempts. PHI detection guards against sensitive data exposure.
    -   **Admin Access:** Memory access for administrators is restricted via an allowlist.
-   **Triage Module:** Features nested comments, anonymous posting, PHI detection, and liking functionality.
-   **News Feed:** Allows users to like and comment on articles, with filtering by source and specialty.
-   **Groups & Events:** Provides professional networking with group details (member lists, avatars) and event management (photos, RSVP, capacity tracking).
-   **Messaging (Chats):** Supports direct and group threads with file attachment indicators.
-   **Training Modules:** Expandable modules with completion tracking.
-   **Doctors Directory:** A full-screen searchable directory with ranking scores and verified badges.
-   **Dashboard:** Offers a calendar view of upcoming events.
-   **Telemedicine:** Includes patient inquiry queues, video call simulation, earnings tracking, and consultation completion features.
-   **PHI Handling:** Client-side detection and auto-redaction capabilities with user confirmation.

## External Dependencies
-   **AI Services:**
    -   Anthropic Claude (`claude-sonnet-4-6`)
-   **Medical Content Providers (MCPs) integrated with Ari AI:**
    -   PubMed
    -   bioRxiv
    -   Open Targets
    -   ClinicalTrials
    -   ChEMBL
    -   CMS Coverage
    -   NPI Registry
-   **Frontend Libraries:**
    -   React
    -   TypeScript
    -   Vite (build tool)
    -   Tailwind CSS (styling)
    -   shadcn/ui (UI components)
    -   wouter (client-side routing)
    -   TanStack React Query (state management)
    -   Zustand (session store)
    -   Framer Motion (animations)
    -   react-markdown, remark-gfm (Markdown rendering)
-   **Backend Libraries/Tools:**
    -   Express.js (server framework)
    -   multer (file uploads)
    -   pdf-parse (PDF parsing)
    -   express-session (session management)
    -   passport-local (local authentication strategy)
    -   Zod (schema validation)
    -   Drizzle (ORM for memory store)