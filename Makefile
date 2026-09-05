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
	# Build through compose so image names and build args live in one place.
	if docker compose version >/dev/null 2>&1; then \
		docker compose --env-file .env -f docker-compose.yml build; \
	else \
		docker-compose --env-file .env -f docker-compose.yml build; \
	fi

up:
	# --build is required: compose only builds when an image is missing, and
	# `down` leaves images behind, so without it a deploy reuses stale code.
	if docker compose version >/dev/null 2>&1; then \
		docker compose --env-file .env -f docker-compose.yml up -d --build; \
	else \
		docker-compose --env-file .env -f docker-compose.yml up -d --build; \
	fi

down:
	if docker compose version >/dev/null 2>&1; then \
		docker compose --env-file .env -f docker-compose.yml down; \
	else \
		docker-compose --env-file .env -f docker-compose.yml down; \
	fi

rebuild:
	$(MAKE) down
	echo "Waiting 1s for resources to free..."
	sleep 1
	$(MAKE) up
