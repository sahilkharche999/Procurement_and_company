#!/usr/bin/env bash
set -euo pipefail

# Build the frontend and backend images and tag them with the names
# docker-compose.yml runs.
#
# Uses plain `docker build` rather than `docker compose build` on purpose: the
# deployment host runs a buildx older than 0.17, which compose build refuses to
# work with ("compose build requires buildx 0.17.0 or later"). The classic
# builder is available everywhere and is what this project has always used.
#
# Two things this must get right, both of which were previously wrong:
#   - the image tags have to match the `image:` keys in docker-compose.yml,
#     or compose runs a stale image and the build is silently discarded
#   - the frontend needs VITE_SERVER_URL at build time; without it the bundle
#     bakes in http://localhost:8000 and every API call fails in production
#
# Usage: ./scripts/build_images.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "ERROR: .env not found in $ROOT_DIR — VITE_SERVER_URL comes from it." >&2
  exit 1
fi

VITE_SERVER_URL="$(grep -E '^VITE_SERVER_URL=' .env | cut -d= -f2- || true)"
if [ -z "$VITE_SERVER_URL" ]; then
  echo "ERROR: VITE_SERVER_URL is not set in .env." >&2
  echo "       The frontend would be built pointing at localhost and break." >&2
  exit 1
fi

echo "Project root:     $ROOT_DIR"
echo "VITE_SERVER_URL:  $VITE_SERVER_URL"
echo

echo "Building frontend image: pco-frontend-image:latest"
docker build \
  --build-arg VITE_SERVER_URL="$VITE_SERVER_URL" \
  -t pco-frontend-image:latest \
  -f "$ROOT_DIR/frontend/Dockerfile" \
  "$ROOT_DIR/frontend"

echo
echo "Building backend image: pco-backend-image:latest"
docker build \
  -t pco-backend-image:latest \
  -f "$ROOT_DIR/backend/Dockerfile" \
  "$ROOT_DIR/backend"

echo
echo "Build complete. Images: pco-frontend-image:latest, pco-backend-image:latest"
