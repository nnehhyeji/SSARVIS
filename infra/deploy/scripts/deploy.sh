#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_DIR="$DEPLOY_DIR/compose"
ENV_DIR="$DEPLOY_DIR/env"

APP_COMPOSE_FILE="$COMPOSE_DIR/docker-compose.app.yml"
DB_COMPOSE_FILE="$COMPOSE_DIR/docker-compose.db.yml"
MONITORING_COMPOSE_FILE="$COMPOSE_DIR/docker-compose.monitoring.yml"
APP_ENV_FILE="$ENV_DIR/app.env"
DB_ENV_FILE="$ENV_DIR/db.env"

log() {
  echo "[deploy] $*"
}

require_file() {
  local file_path="$1"

  if [[ ! -f "$file_path" ]]; then
    echo "[deploy] Required file not found: $file_path" >&2
    exit 1
  fi
}

export_env_file() {
  local file_path="$1"
  set -a
  # shellcheck disable=SC1090
  . "$file_path"
  set +a
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "[deploy] Required command not found: $command_name" >&2
    exit 1
  fi
}

require_command docker
require_file "$APP_COMPOSE_FILE"
require_file "$DB_COMPOSE_FILE"
require_file "$MONITORING_COMPOSE_FILE"
require_file "$APP_ENV_FILE"
require_file "$DB_ENV_FILE"

log "Initializing Docker networks"
"$SCRIPT_DIR/init-network.sh"

log "Loading deployment environment from $APP_ENV_FILE"
export_env_file "$APP_ENV_FILE"

if [[ -n "${DOCKERHUB_USERNAME:-}" && -n "${DOCKERHUB_TOKEN:-}" ]]; then
  log "Logging in to Docker Hub"
  printf '%s' "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
else
  log "Docker Hub credentials not set. Skipping docker login."
fi

log "Pulling application images"
docker compose --env-file "$APP_ENV_FILE" -f "$APP_COMPOSE_FILE" pull

log "Starting database services"
docker compose --env-file "$DB_ENV_FILE" -f "$DB_COMPOSE_FILE" up -d

log "Starting application services"
docker compose --env-file "$APP_ENV_FILE" -f "$APP_COMPOSE_FILE" up -d

log "Starting monitoring services"
docker compose -f "$MONITORING_COMPOSE_FILE" up -d

log "Deployment completed successfully."
