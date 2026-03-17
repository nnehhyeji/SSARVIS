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
DOCKER_CMD=()

log() {
  echo "[deploy] $*"
}

print_app_diagnostics() {
  log "Application deployment failed. Printing compose status."
  "${DOCKER_CMD[@]}" compose --env-file "$APP_ENV_FILE" -f "$APP_COMPOSE_FILE" ps || true

  log "Recent backend logs:"
  "${DOCKER_CMD[@]}" compose --env-file "$APP_ENV_FILE" -f "$APP_COMPOSE_FILE" logs --tail=200 backend || true

  log "Recent redis logs:"
  "${DOCKER_CMD[@]}" compose --env-file "$APP_ENV_FILE" -f "$APP_COMPOSE_FILE" logs --tail=100 redis || true
}

wait_for_container_health() {
  local container_name="$1"
  local max_attempts="${2:-20}"
  local attempt=1
  local health_status

  while (( attempt <= max_attempts )); do
    health_status="$("${DOCKER_CMD[@]}" inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_name" 2>/dev/null || true)"

    if [[ "$health_status" == "healthy" || "$health_status" == "running" ]]; then
      log "Container is ready: $container_name ($health_status)"
      return 0
    fi

    log "Waiting for container: $container_name (attempt $attempt/$max_attempts, status=${health_status:-unknown})"
    sleep 5
    ((attempt++))
  done

  echo "[deploy] Container did not become ready: $container_name" >&2
  "${DOCKER_CMD[@]}" logs --tail=200 "$container_name" || true
  exit 1
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

init_docker_cmd() {
  if docker info >/dev/null 2>&1; then
    DOCKER_CMD=(docker)
    return
  fi

  if command -v sudo >/dev/null 2>&1 && sudo -n docker info >/dev/null 2>&1; then
    DOCKER_CMD=(sudo -n docker)
    return
  fi

  echo "[deploy] Docker daemon access is unavailable for the current user. Add the user to the docker group or allow passwordless sudo for docker." >&2
  exit 1
}

require_command docker
init_docker_cmd
require_file "$APP_COMPOSE_FILE"
require_file "$DB_COMPOSE_FILE"
require_file "$MONITORING_COMPOSE_FILE"
require_file "$APP_ENV_FILE"
require_file "$DB_ENV_FILE"
trap 'print_app_diagnostics' ERR

log "Initializing Docker networks"
"$SCRIPT_DIR/init-network.sh" "${DOCKER_CMD[@]}"

log "Loading deployment environment from $APP_ENV_FILE"
export_env_file "$APP_ENV_FILE"

if [[ -n "${DOCKERHUB_USERNAME:-}" && -n "${DOCKERHUB_TOKEN:-}" ]]; then
  log "Logging in to Docker Hub"
  printf '%s' "$DOCKERHUB_TOKEN" | "${DOCKER_CMD[@]}" login -u "$DOCKERHUB_USERNAME" --password-stdin
else
  log "Docker Hub credentials not set. Skipping docker login."
fi

log "Pulling application images"
"${DOCKER_CMD[@]}" compose --env-file "$APP_ENV_FILE" -f "$APP_COMPOSE_FILE" pull

log "Starting database services"
"${DOCKER_CMD[@]}" compose --env-file "$DB_ENV_FILE" -f "$DB_COMPOSE_FILE" up -d
wait_for_container_health mysql 24
wait_for_container_health mongodb 24

log "Starting application services"
"${DOCKER_CMD[@]}" compose --env-file "$APP_ENV_FILE" -f "$APP_COMPOSE_FILE" up -d

log "Starting monitoring services"
"${DOCKER_CMD[@]}" compose -f "$MONITORING_COMPOSE_FILE" up -d

trap - ERR
log "Deployment completed successfully."
