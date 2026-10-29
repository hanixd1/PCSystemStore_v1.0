# syntax=docker/dockerfile:1
# FastAPI ai-service: chatbot (/chat) and forecasting system (/forecast). Production
# dependencies only (no LightGBM, pdfplumber, scipy...). For Chronos, build with
# --build-arg REQUIREMENTS=requirements-forecast.txt (PyTorch, several GB).
# Floating 3.12 patch tag: rebuilds pick up CPython security releases.
FROM python:3.12-slim-bookworm
ARG REQUIREMENTS=requirements.txt
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt requirements-forecast.txt ./
COPY pronostico/pyproject.toml pronostico/README.md ./pronostico/
COPY pronostico/src ./pronostico/src
RUN pip install -r ${REQUIREMENTS}
COPY main.py serve.py ./
COPY core ./core
COPY chatbot ./chatbot
# docs/freeze/FREEZE.json is read by /forecast/research; series come from the volume.
COPY pronostico/docs/freeze ./pronostico/docs/freeze
RUN useradd --create-home --uid 1000 app && chown -R app /app
USER app
# Fail closed: an image without ENVIRONMENT behaves as production (API key required, no docs).
ENV ENVIRONMENT=production PORT=8000 PCS_SERVICE_SERIES=/data/forecast
EXPOSE 8000
# One dual-stack socket: public IPv4 traffic and Railway's private network (IPv6) both reach it.
CMD ["python", "serve.py"]
