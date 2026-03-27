# Infra Agent

## Ownership

- Owns `infra/`
- Treats application images and env files as deployment inputs

## Mission

Maintain the compose-based runtime topology, reverse proxy, network layout, and deployment scripts that connect frontend/nginx, backend, AI, data stores, and monitoring.

## Current System Understanding

### Deployment architecture

- Infra is split across compose files in `infra/deploy/compose/`.
- Stacks are separated by responsibility:
  - `docker-compose.db.yml`: MySQL + MongoDB
  - `docker-compose.app.yml`: nginx + backend + redis
  - `docker-compose.ai.yml`: AI + Qdrant
  - `docker-compose.monitoring.yml`: monitoring stack
- Services communicate through external Docker networks:
  - `public-net`
  - `internal-net`
  - `db-net`
  - `monitoring-net`

### Runtime wiring

- `infra/deploy/compose/docker-compose.app.yml`
  - `nginx` serves the frontend image and reverse-proxies backend APIs/WebSocket
  - `backend` joins internal, db, and monitoring networks
  - `redis` is colocated with the app stack for SSE/pubsub support
- `infra/deploy/compose/docker-compose.ai.yml`
  - `ai` exposes port 8000 internally
  - `qdrant` exposes port 6333 internally and persists vector storage
- `infra/deploy/compose/docker-compose.db.yml`
  - `mysql` and `mongodb` run on `db-net` with persistent volumes

### Nginx behavior

- `infra/nginx/conf.d/default.conf` is the main reverse proxy config.
- Traffic routing:
  - `/api/v1/sse/` -> backend with buffering disabled and long timeouts
  - `/api/v1/` -> backend
  - `/ws/chat` -> backend with upgrade headers
  - `/kibana/` -> kibana behind basic auth
  - everything else -> SPA fallback to `index.html`
- TLS terminates at nginx on 8443 inside the container and maps to host 443.

### Deployment script

- `infra/deploy/scripts/deploy.sh` orchestrates end-to-end deployment.
- Sequence:
  - verify required compose/env files
  - initialize Docker access and networks
  - optionally log into Docker Hub
  - pull images
  - start DB stack and wait for health
  - start monitoring stack and wait for health
  - start app + AI stack and wait for health
  - seed `notification_types` in MySQL
- Failure mode:
  - prints diagnostics with compose status and recent logs for failed stacks

## Expected Environment Inputs

- Separate env files under `infra/deploy/env/` for:
  - app
  - db
  - ai
  - monitoring
- App stack expects image tags, secrets, APM config, and backend/AI environment.
- DB stack expects MySQL and Mongo credentials.
- AI stack expects provider secrets and runtime settings through `ai.env` and `ai.secret.env`.

## Assumptions / Unclear Spots

- Monitoring compose was not opened here, so I only infer Elastic/Kibana/Logstash/APM from `deploy.sh` and app environment usage.
- The frontend is delivered via the nginx container image referenced as `${WEB_IMAGE}:${WEB_TAG}`, so the built SPA is assumed to be baked into that image rather than mounted.
- No Kubernetes or cloud-native deployment manifests are present under `infra/`; Docker Compose is the primary deployment path in this repo.

## Key Files

- `infra/deploy/compose/docker-compose.app.yml`
- `infra/deploy/compose/docker-compose.ai.yml`
- `infra/deploy/compose/docker-compose.db.yml`
- `infra/nginx/conf.d/default.conf`
- `infra/deploy/scripts/deploy.sh`
- `infra/deploy/scripts/init-network.sh`
