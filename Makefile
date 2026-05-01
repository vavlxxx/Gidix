COMPOSE=docker compose

.PHONY: help env up up-osrm down logs migrate seed backend-shell test frontend-build smoke

help:
	@echo "make env             - create .env from .env.example if missing"
	@echo "make up              - start postgres, backend and frontend"
	@echo "make up-osrm         - start project with local OSRM container"
	@echo "make down            - stop containers"
	@echo "make migrate         - run Alembic migrations"
	@echo "make seed            - seed roles, users, points and demo excursion"
	@echo "make test            - run backend tests in backend container"
	@echo "make smoke           - run smoke_check.py against local API"

env:
	@if [ ! -f .env ]; then cp .env.example .env; fi

up: env
	$(COMPOSE) up --build

up-osrm: env
	$(COMPOSE) --profile osrm up --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f backend frontend

migrate:
	$(COMPOSE) run --rm backend alembic upgrade head

seed:
	$(COMPOSE) run --rm backend python -m src.seed

backend-shell:
	$(COMPOSE) run --rm backend bash

test:
	$(COMPOSE) run --rm backend pytest -q

frontend-build:
	$(COMPOSE) run --rm frontend npm run build

smoke:
	python smoke_check.py
