# Makefile to orchestrate build and docker-compose operations
SHELL := /bin/bash

.PHONY: help build-images up down rebuild

help:
	@echo "Usage: make <target>"
	@echo "Targets:"
	@echo "  build-images   - Build frontend and backend Docker images"
	@echo "  up             - Start services (docker compose up -d)"
	@echo "  down           - Stop services (docker compose down)"
	@echo "  rebuild        - Rebuild images and restart services"

build-images:
	# Builds with the classic `docker build`; the deploy host's buildx is older
	# than `docker compose build` accepts. The script tags the images with the
	# same names docker-compose.yml runs, and passes VITE_SERVER_URL.
	chmod +x scripts/build_images.sh
	./scripts/build_images.sh

up:
	# --no-build: images are produced by `make build-images` above. Compose is
	# not allowed to build here because that path needs a newer buildx than the
	# server has, and it would fail mid-deploy with the containers already down.
	if docker compose version >/dev/null 2>&1; then \
		docker compose --env-file .env -f docker-compose.yml up -d --no-build; \
	else \
		docker-compose --env-file .env -f docker-compose.yml up -d; \
	fi

down:
	if docker compose version >/dev/null 2>&1; then \
		docker compose --env-file .env -f docker-compose.yml down; \
	else \
		docker-compose --env-file .env -f docker-compose.yml down; \
	fi

rebuild:
	# Build first, while the running containers keep serving. A build that fails
	# then leaves production untouched instead of stopped — the old order took
	# everything down before finding out whether the new images were usable.
	$(MAKE) build-images
	$(MAKE) down
	echo "Waiting 1s for resources to free..."
	sleep 1
	$(MAKE) up
