#!/usr/bin/env bash
set -euo pipefail

# Build frontend and backend docker images using the existing Dockerfiles
# Usage: ./scripts/build_images.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Project root: $ROOT_DIR"

# Frontend image
echo "Building frontend image: editor-frontend-image:latest"
docker build -t editor-frontend-image:latest -f "$ROOT_DIR/frontend/Dockerfile" "$ROOT_DIR/frontend"

# Backend image
echo "Building backend image: editor-backend-image:latest"
docker build -t editor-backend-image:latest -f "$ROOT_DIR/backend/Dockerfile" "$ROOT_DIR/backend"

echo "Build complete. Images: editor-frontend-image:latest, editor-backend-image:latest"
