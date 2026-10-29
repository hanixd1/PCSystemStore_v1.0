.DEFAULT_GOAL := help
IMAGE ?= pcsforecast:dev
SCANNER_IMAGE ?= sonarsource/sonar-scanner-cli:12.2.0.4256_8.1.0

.PHONY: help install lint typecheck test check reports test-docker docker-build \
        sonar-up sonar-down sonar-gate sonar dashboard check-privacy

help: ## List targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-14s %s\n", $$1, $$2}'

install: ## Create the venv with core + dev dependencies and install git hooks
	uv sync
	uv run pre-commit install

lint: ## Ruff lint and format check
	uv run ruff check .
	uv run ruff format --check .

typecheck: ## Strict mypy
	uv run mypy src tests

test: ## Tests with branch coverage (fails under 80 %)
	uv run pytest

check: lint typecheck test ## Everything the quality gate needs, on the host

reports: ## Produce the report files read by SonarQube
	mkdir -p reports
	uv run pytest -q
	uv run ruff check . --output-format json --exit-zero > reports/ruff.json
	uv run mypy src tests --show-column-numbers --no-error-summary > reports/mypy.txt || true

docker-build: ## Build the Linux test image
	docker build --build-arg UV_EXTRAS="--extra stats" -t $(IMAGE) .

test-docker: docker-build ## Run the test suite inside the container
	docker run --rm $(IMAGE) pytest -p no:cacheprovider -o addopts="-ra --strict-markers" -q
	docker run --rm $(IMAGE) pcs check-config

sonar-up: ## Start the local SonarQube server (http://localhost:9000)
	docker compose -f docker-compose.sonar.yml up -d

sonar-down: ## Stop the local SonarQube server (data volumes are kept)
	docker compose -f docker-compose.sonar.yml down

sonar-gate: ## Create the project quality gate (docs/quality/quality_plan.md) in SonarQube
	@test -f .env || (echo "Create .env from .env.example and set SONAR_TOKEN" && exit 1)
	set -a && . ./.env && set +a && ./scripts/sonar_quality_gate.sh

sonar: reports ## Analyse the project; needs SONAR_TOKEN in .env
	@test -f .env || (echo "Create .env from .env.example and set SONAR_TOKEN" && exit 1)
	docker run --rm --platform linux/amd64 --env-file .env \
	  -e SONAR_HOST_URL=http://host.docker.internal:9000 \
	  -v "$(CURDIR):/usr/src" $(SCANNER_IMAGE)

dashboard: ## Read-only research dashboard on http://localhost:8501 (needs `uv sync --extra app`)
	uv run streamlit run app/dashboard.py --server.headless true --server.address 127.0.0.1

check-privacy: ## Restrict data/private and search all outputs for customer names
	uv run pcs check-privacy
