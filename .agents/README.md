# Domain Agents

This directory defines four repository-specific domain agents. Each agent owns one top-level area and includes a working summary of the current service logic so the next collaborator can start with context instead of rediscovering it.

- `ai-agent.md`: FastAPI AI server, prompt/voice/chat orchestration
- `frontend-agent.md`: React client routing, state, and real-time chat UX
- `backend-agent.md`: Spring Boot API, persistence, auth, notifications, chat relay
- `infra-agent.md`: Compose-based deployment, nginx routing, runtime topology

These briefs were derived from the current code under `ai/`, `frontend/`, `backend/`, and `infra/`.
