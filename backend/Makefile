# ─────────────────────────────────────────────────────────────────────────────
#  Leave Management System — Backend Makefile
# ─────────────────────────────────────────────────────────────────────────────
#
#  Pre-commit checks (lint · vet · build · test) are already handled by the
#  Git hook at .git/hooks/pre-commit and golangci-lint (.golangci.yml).
#  This Makefile is for developer convenience and CI pipeline steps only.
#
#  Environment:
#    DB_URL — postgres DSN required for migrate-* and seed targets.
#             Set it in .env or: export DB_URL=postgres://...
# ─────────────────────────────────────────────────────────────────────────────

# ── Variables ─────────────────────────────────────────────────────────────────
APP_NAME      := leave-management-system
BINARY        := bin/$(APP_NAME)
GO            := go
GOOSE         := goose
COMPOSE       := docker compose
MIGRATION_DIR := migration
SERVER_PKG    := ./cmd/server
SEED_PKG      := ./cmd/seed

# Auto-load .env if present
ifneq (,$(wildcard .env))
  include .env
  export
endif

# ── Phony targets ─────────────────────────────────────────────────────────────
.PHONY: help \
        setup deps vendor \
        fmt vet lint \
        test test-coverage test-race \
        build run \
        docker-up docker-down docker-logs docker-ps \
        migrate-up migrate-down migrate-status migrate-create migrate-reset \
        seed \
        clean

.DEFAULT_GOAL := help

# ─────────────────────────────────────────────────────────────────────────────
#  Help
# ─────────────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  $(APP_NAME)"
	@echo ""
	@echo "  NOTE: lint · vet · build · test run automatically on every commit"
	@echo "        via .git/hooks/pre-commit + .golangci.yml — no need to run"
	@echo "        them manually unless you want an early check."
	@echo ""
	@echo "  ── Setup ────────────────────────────────────────────────────────"
	@echo "  make setup               Copy .env.example → .env, tidy modules"
	@echo "  make deps                go mod tidy"
	@echo "  make vendor              go mod vendor"
	@echo ""
	@echo "  ── Code Quality (manual / CI use) ───────────────────────────────"
	@echo "  make fmt                 Format all Go source files"
	@echo "  make vet                 go vet (already runs in pre-commit hook)"
	@echo "  make lint                golangci-lint (already runs in pre-commit hook)"
	@echo ""
	@echo "  ── Testing ──────────────────────────────────────────────────────"
	@echo "  make test                Run all tests"
	@echo "  make test-coverage       Run tests + generate HTML coverage report"
	@echo "  make test-race           Run tests with -race flag"
	@echo ""
	@echo "  ── Build & Run ──────────────────────────────────────────────────"
	@echo "  make build               Compile binary → ./bin/"
	@echo "  make run                 Run server via go run"
	@echo ""
	@echo "  ── Docker ───────────────────────────────────────────────────────"
	@echo "  make docker-up           Build images and start all services"
	@echo "  make docker-down         Stop and remove containers"
	@echo "  make docker-logs         Tail container logs"
	@echo "  make docker-ps           List running containers"
	@echo ""
	@echo "  ── Migrations (requires goose) ───────────────────────────────────"
	@echo "  make migrate-up          Apply all pending migrations"
	@echo "  make migrate-down        Roll back the last migration"
	@echo "  make migrate-status      Show applied / pending migrations"
	@echo "  make migrate-create NAME=<name>  Create a new migration file"
	@echo "  make migrate-reset       Roll back ALL migrations  ⚠ destructive"
	@echo "  make seed                Seed the database"
	@echo ""
	@echo "  ── Cleanup ──────────────────────────────────────────────────────"
	@echo "  make clean               Remove ./bin and coverage artefacts"
	@echo ""

# ─────────────────────────────────────────────────────────────────────────────
#  Setup
# ─────────────────────────────────────────────────────────────────────────────
setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✔  Created .env from .env.example — fill in your values."; \
	else \
		echo "✔  .env already exists."; \
	fi
	@$(MAKE) deps

deps:
	$(GO) mod tidy

vendor:
	$(GO) mod vendor

# ─────────────────────────────────────────────────────────────────────────────
#  Code Quality
#  These are already enforced by the pre-commit hook + golangci.yml.
#  Kept here for manual runs and CI pipelines.
# ─────────────────────────────────────────────────────────────────────────────
fmt:
	$(GO) fmt ./...

vet:
	$(GO) vet ./...

lint:
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run --config .golangci.yml ./...; \
	else \
		echo "golangci-lint not found. Install: https://golangci-lint.run/usage/install/"; \
		exit 1; \
	fi

# ─────────────────────────────────────────────────────────────────────────────
#  Testing
# ─────────────────────────────────────────────────────────────────────────────
test:
	$(GO) test ./... -count=1

test-coverage:
	$(GO) test ./... -coverprofile=coverage.out -covermode=atomic
	$(GO) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

test-race:
	$(GO) test ./... -race -count=1

# ─────────────────────────────────────────────────────────────────────────────
#  Build & Run
# ─────────────────────────────────────────────────────────────────────────────
build:
	@mkdir -p bin
	$(GO) build -ldflags="-s -w" -o $(BINARY) $(SERVER_PKG)
	@echo "✔  Binary: $(BINARY)"

run:
	$(GO) run $(SERVER_PKG)

# ─────────────────────────────────────────────────────────────────────────────
#  Docker
# ─────────────────────────────────────────────────────────────────────────────
docker-up:
	$(COMPOSE) up --build -d

docker-down:
	$(COMPOSE) down

docker-logs:
	$(COMPOSE) logs -f

docker-ps:
	$(COMPOSE) ps

# ─────────────────────────────────────────────────────────────────────────────
#  Migrations
# ─────────────────────────────────────────────────────────────────────────────
_check-db-url:
	@if [ -z "$(DB_URL)" ]; then \
		echo "Error: DB_URL is not set."; \
		echo "  Add it to .env or run: export DB_URL=<postgres-dsn>"; \
		exit 1; \
	fi

migrate-up: _check-db-url
	$(GOOSE) -dir $(MIGRATION_DIR) postgres "$(DB_URL)" up

migrate-down: _check-db-url
	$(GOOSE) -dir $(MIGRATION_DIR) postgres "$(DB_URL)" down

migrate-status: _check-db-url
	$(GOOSE) -dir $(MIGRATION_DIR) postgres "$(DB_URL)" status

migrate-create:
	@if [ -z "$(NAME)" ]; then \
		echo "Error: NAME is required. Usage: make migrate-create NAME=<migration_name>"; \
		exit 1; \
	fi
	$(GOOSE) -dir $(MIGRATION_DIR) create $(NAME) sql
	@echo "✔  Migration created in $(MIGRATION_DIR)/"

# ⚠ Rolls back every migration — dev use only
migrate-reset: _check-db-url
	@echo "WARNING: This will roll back ALL migrations."
	@read -p "Type 'yes' to continue: " confirm && [ "$$confirm" = "yes" ] || exit 1
	$(GOOSE) -dir $(MIGRATION_DIR) postgres "$(DB_URL)" reset

# ─────────────────────────────────────────────────────────────────────────────
#  Seed
# ─────────────────────────────────────────────────────────────────────────────
seed: _check-db-url
	$(GO) run $(SEED_PKG)

# ─────────────────────────────────────────────────────────────────────────────
#  Clean
# ─────────────────────────────────────────────────────────────────────────────
clean:
	rm -rf bin coverage.out coverage.html
	@echo "✔  Cleaned build artefacts"
