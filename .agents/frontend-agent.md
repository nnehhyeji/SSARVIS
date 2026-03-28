# Frontend Agent

## Ownership

- Owns `frontend/`
- Treats backend and AI as external contracts

## Mission

Maintain the React/Vite client that drives auth, home/profile/settings surfaces, follow interactions, persona setup, and real-time voice/text chat experiences.

## Current System Understanding

### Product surfaces and routing

- Router is defined in `frontend/src/routes/AppRouter.tsx`.
- Public routes:
  - landing
  - guest experience
  - guest completion
  - login
  - signup
- Main authenticated surfaces under `MainLayout`:
  - home/user visit
  - assistant
  - namna
  - chat archive
  - profile
  - settings
  - card
  - persona survey

### API boundary

- Base URL normalization lives in `frontend/src/config/api.ts`.
- Browser HTTP calls are grouped in `frontend/src/apis/*.ts`.
- The client assumes backend REST under `/api/v1`.
- Realtime chat uses WebSocket origin derived from the same base origin, not a separate AI URL.

### Auth flow

- `frontend/src/pages/auth/LoginPage.tsx` handles login.
- Flow:
  - POST credentials through `authApi`
  - store `accessToken` in `localStorage`
  - fetch current user via `userApi.getUserProfile()`
  - hydrate `useUserStore`
  - fetch voice-lock status through `useVoiceLockStore`
- Auto-login uses stored token + remembered ID flags from local storage.

### Chat flow

- Core interactive chat hook is `frontend/src/hooks/useChat.ts`.
- It manages:
  - a browser WebSocket to `/ws/chat?token=...`
  - audio capture with `MediaRecorder`
  - speech recognition for wake word and STT
  - incremental audio playback through `MediaSource`
  - mixed text/binary stream handling from the server
- Outbound sequence:
  - send `CHAT_START`
  - stream recorded audio chunks
  - send `AUDIO_END`
  - optionally send `TEXT`
- Inbound sequence:
  - `text.start`
  - `text.end`
  - `voice.start`
  - binary audio chunks
  - `END_OF_STREAM` or error/cancel states

### AI-vs-AI flow

- `frontend/src/hooks/useAIToAIChat.ts` opens two `/ws/chat` sockets.
- It alternates turns between "mine" and "target" assistants.
- Responses are relayed turn-by-turn until pause, stop, error, or `MAX_TURN`.
- It stores each side's latest text and audio stream state separately.

### State and feature areas

- Global stores in `frontend/src/store/`:
  - user
  - voice lock
  - notifications
  - face/avatar
- Feature hooks in `frontend/src/hooks/`:
  - chat
  - AI-to-AI chat
  - follow
  - guest chat
  - AI character selection
  - speech topic input
  - notifications
- UI is organized by page and feature component folders.

## External Contracts To Keep Stable

- REST base path logic in `frontend/src/config/api.ts`
- Auth token storage in `localStorage`
- WebSocket endpoint `/ws/chat`
- Backend event types used by chat hooks:
  - `ACK`
  - `text.start`
  - `text.end`
  - `voice.start`
  - `voice.delta`
  - `END_OF_STREAM`
  - `CANCELLED`
  - `ERROR` / `error`

## Assumptions / Unclear Spots

- Several Korean strings render with broken encoding in checked-in files; behavior is still inferable from code structure.
- I did not inspect every page component, so page-level styling/layout specifics are secondary to the route and data-flow model above.
- The frontend talks only to the Spring backend directly; the backend appears to relay AI traffic to FastAPI.

## Key Files

- `frontend/src/routes/AppRouter.tsx`
- `frontend/src/config/api.ts`
- `frontend/src/hooks/useChat.ts`
- `frontend/src/hooks/useAIToAIChat.ts`
- `frontend/src/pages/auth/LoginPage.tsx`
- `frontend/src/apis/authApi.ts`
- `frontend/src/apis/userApi.ts`
- `frontend/src/store/useUserStore.ts`
- `frontend/src/store/useVoiceLockStore.ts`
