# AI Agent

## Ownership

- Owns `ai/`
- Ignores application code outside `ai/` except for contract awareness

## Mission

Maintain the FastAPI AI service that generates persona prompts, enrolls custom voices, and produces text plus TTS chat responses with vector-memory lookup.

## Current System Understanding

### Service role

- Entry point is `ai/app/main.py`.
- The app starts FastAPI, mounts `/api/v1`, and initializes the default Qdrant collection during lifespan startup.
- Routing is split by domain in `ai/app/api/router.py`:
  - `prompt`
  - `voice`
  - `chat`

### Prompt flow

- `ai/app/domains/prompt/service.py` builds a system prompt from Q&A pairs.
- It uses `OpenAIClient.generate(...)` with either a fresh-prompt meta instruction or an update meta instruction from `ai/app/prompts.py`.
- Main behavior:
  - If `systemPrompt` is absent, create a new persona/system prompt from Q&A.
  - If `systemPrompt` exists, treat it as an update target and revise it with new Q&A.

### Voice flow

- `ai/app/domains/voice/service.py` handles voice enrollment and synthesis.
- Enrollment path:
  - Read uploaded audio
  - Transcode to MP3 through `ai/app/infra/audio_transcoder.py`
  - Base64-wrap as a data URI
  - Send to DashScope voice cloning via `ai/app/infra/dashscope.py`
- Deletion delegates to DashScope.
- In-place update is intentionally unsupported and raises `VoiceUpdateNotSupportedError`.
- TTS synthesis streams binary chunks from DashScope back to the caller.

### Chat flow

- Core chat orchestration is in `ai/app/domains/chat/service.py`.
- Request preparation:
  - Embed the user query with `OpenAIClient.embed(...)`
  - If `memoryPolicy == GENERAL`, search similar conversations in Qdrant through `ai/app/domains/chat/repository.py`
  - Build a final message list from:
    - caller-supplied `systemPrompt`
    - prior chat history
    - retrieved similar conversations
    - public conversation guardrails when `isFollowing` is false
    - extra AI-vs-AI discussion guidance when `chatSessionType == AI_AI`
- Save flow:
  - Only persists when memory policy is `GENERAL`
  - Re-embeds `Q + A`
  - Stores text/response/vector in Qdrant for future retrieval
- Response shape is text-first plus voice streaming, matching the API contract documented in `ai/README.md`.

### Integrations and config

- OpenAI:
  - generation + embeddings
  - files: `ai/app/infra/openai.py`, `ai/app/config/openai.py`
- DashScope:
  - custom voice enrollment + TTS
  - files: `ai/app/infra/dashscope.py`, `ai/app/config/dashscope.py`
- Qdrant:
  - vector memory store for similar-conversation retrieval
  - files: `ai/app/infra/qdrant.py`, `ai/app/config/vectordb.py`
- Media helpers:
  - opus/webm/audio buffering/transcoding in `ai/app/infra/*.py`

## External Contracts To Keep Stable

- Health endpoint: `GET /api/health`
- API prefix: `/api/v1`
- Prompt API contract is described in `ai/README.md`
- Chat streaming protocol expects:
  - `text.start`
  - `text.end`
  - `voice.start`
  - repeated `voice.delta` + binary frames
  - `voice.end`

## Assumptions / Unclear Spots

- `ai/README.md` documents the chat/voice contracts, but some text encoding is broken in the current file. The code is more reliable than the prose for fine details.
- I did not validate the exact schema classes or every router-level validation rule; use `ai/app/domains/*/schema.py` when contract changes matter.
- The AI service appears to be downstream of the Spring backend WebSocket relay rather than called directly by the browser in production.

## Key Files

- `ai/app/main.py`
- `ai/app/api/router.py`
- `ai/app/domains/prompt/service.py`
- `ai/app/domains/voice/service.py`
- `ai/app/domains/chat/service.py`
- `ai/app/domains/chat/repository.py`
- `ai/app/infra/openai.py`
- `ai/app/infra/dashscope.py`
- `ai/app/infra/qdrant.py`
