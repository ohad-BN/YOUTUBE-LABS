.PHONY: dev install install-be install-fe db-up db-down db-reset wait-db migrate stop clean help

VENV := backend/.venv
PIP  := $(VENV)/bin/pip

# ── Entry points ─────────────────────────────────────────────────────────────

## Start everything: install deps, start DB, migrate, then launch Overmind
dev: install db-up wait-db migrate
	overmind start

## Alias for first-time setup
setup: dev

# ── Dependencies ──────────────────────────────────────────────────────────────

install: install-be install-fe

$(VENV):
	python3 -m venv $(VENV)

install-be: $(VENV)
	$(PIP) install --quiet -r backend/requirements.txt

install-fe:
	cd frontend && bun install

# ── Database ──────────────────────────────────────────────────────────────────

db-up:
	docker compose up -d postgres

db-down:
	docker compose down

## Drop the volume and recreate (fresh DB)
db-reset: db-down
	docker compose rm -f -v postgres
	$(MAKE) db-up wait-db migrate

## Block until Postgres is accepting connections (max 30s)
wait-db:
	@printf "Waiting for PostgreSQL"
	@for i in $$(seq 1 30); do \
		docker compose exec -T postgres pg_isready -U postgres -d youtubelabs -q 2>/dev/null \
			&& printf " ready.\n" && exit 0; \
		[ $$i -eq 30 ] && printf "\nTimed out waiting for PostgreSQL.\n" && exit 1; \
		printf "."; sleep 1; \
	done

# ── Migrations ────────────────────────────────────────────────────────────────

migrate:
	cd backend && .venv/bin/alembic upgrade head

migrate-down:
	cd backend && .venv/bin/alembic downgrade -1

# ── Process management ────────────────────────────────────────────────────────

stop:
	-overmind stop 2>/dev/null
	docker compose down

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean:
	rm -rf $(VENV) frontend/node_modules
	docker compose down -v

# ── Help ──────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "  make dev        Install deps, start DB, run migrations, launch Overmind"
	@echo "  make install    Install Python venv + bun dependencies"
	@echo "  make db-up      Start PostgreSQL container"
	@echo "  make db-down    Stop PostgreSQL container"
	@echo "  make db-reset   Wipe DB volume and start fresh"
	@echo "  make migrate    Run Alembic migrations (upgrade head)"
	@echo "  make stop       Stop Overmind and Docker"
	@echo "  make clean      Remove venv, node_modules, and DB volume"
	@echo ""
