# syntax=docker/dockerfile:1
# Reproducible Linux runtime for tests and batch runs (linux/arm64 on Apple silicon).
FROM python:3.12.15-slim-bookworm AS base

COPY --from=ghcr.io/astral-sh/uv:0.13.4 /uv /uvx /usr/local/bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_HTTP_TIMEOUT=180 \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    PCS_PROJECT_ROOT=/workspace \
    HF_HOME=/workspace/models_cache \
    HF_HUB_DISABLE_TELEMETRY=1

WORKDIR /workspace

# OpenMP runtime required by LightGBM.
RUN apt-get update \
    && apt-get install --no-install-recommends -y libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Dependencies first (cached layer), from the lockfile only.
ARG UV_EXTRAS=""
COPY pyproject.toml uv.lock README.md ./
# The download cache survives failed builds, so a network timeout does not restart from zero.
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-install-project ${UV_EXTRAS}

COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen ${UV_EXTRAS}

COPY configs ./configs
COPY tests ./tests

RUN useradd --create-home --uid 1000 pcs && chown -R pcs /workspace
USER pcs

CMD ["pytest"]
