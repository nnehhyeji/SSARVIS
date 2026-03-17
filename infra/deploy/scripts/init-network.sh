#!/usr/bin/env bash

set -Eeuo pipefail

NETWORKS=(
  "public-net"
  "internal-net"
  "db-net"
  "monitoring-net"
)

for network in "${NETWORKS[@]}"; do
  if docker network inspect "$network" >/dev/null 2>&1; then
    echo "[init-network] Network already exists: $network"
    continue
  fi

  echo "[init-network] Creating network: $network"
  docker network create "$network" >/dev/null
done

echo "[init-network] Network initialization complete."
