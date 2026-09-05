#!/usr/bin/env bash
set -euo pipefail

# Build the frontend and backend images.
#
# This delegates to docker compose on purpose. Building directly with `docker
# build` used to tag editor-frontend-image / editor-backend-image while
# docker-compose.yml ran pco-frontend-image / pco-backend-image, so the images
# built here were never the ones deployed. It also skipped the
# VITE_SERVER_URL build arg, which bakes http://localhost:8000 into the
# frontend bundle and breaks it in production.
#
# Usage: ./scripts/build_images.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "ERROR: .env not found in $ROOT_DIR — VITE_SERVER_URL and the Mongo/AWS settings come from it." >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
else
  COMPOSE=(docker-compose)
fi

echo "Building images via docker compose (project root: $ROOT_DIR)"
"${COMPOSE[@]}" --env-file .env -f docker-compose.yml build "$@"

echo "Build complete. Images: pco-frontend-image:latest, pco-backend-image:latest"
