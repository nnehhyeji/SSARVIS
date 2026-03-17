#!/usr/bin/env bash

set -Eeuo pipefail

NETWORKS=(
  "public-net"
  "internal-net"
  "db-net"
  "monitoring-net"
)

DOCKER_CMD=("${@:-docker}")

for network in "${NETWORKS[@]}"; do
  if "${DOCKER_CMD[@]}" network inspect "$network" >/dev/null 2>&1; then
    echo "[init-network] Network already exists: $network"
    continue
  fi

  echo "[init-network] Creating network: $network"
  "${DOCKER_CMD[@]}" network create "$network" >/dev/null
done

echo "[init-network] Network initialization complete."
