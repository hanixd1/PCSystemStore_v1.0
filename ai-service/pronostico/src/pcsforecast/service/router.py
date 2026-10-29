"""FastAPI routes of the forecasting system, mounted by the ai-service under ``/forecast``."""

from __future__ import annotations

import logging
import os
import threading
from functools import lru_cache
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from pcsforecast.paths import ProjectPaths, project_paths
from pcsforecast.service.data import load_series
from pcsforecast.service.forecast import (
    MAX_HORIZON,
    SENSITIVITY_HORIZON,
    VALIDATED_HORIZON,
    ForecastEngine,
    default_model,
)
from pcsforecast.service.precomputed import load_precomputed
from pcsforecast.service.research import research_summary

logger = logging.getLogger(__name__)

router = APIRouter()

# Set while the startup warm-up loads the model and computes the forecasts (about 15 s).
_warming_up = threading.Event()
_engine_lock = threading.Lock()
WARM_UP_RETRY_SECONDS = 15


class CategoryStock(BaseModel):
    category: str = Field(min_length=1, max_length=40)
    stock: int = Field(ge=0)


class StockCoverageRequest(BaseModel):
    categories: list[CategoryStock] = Field(default_factory=list, max_length=100)
    month: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}$")


@lru_cache(maxsize=1)
def _paths() -> ProjectPaths:
    return project_paths()


@lru_cache(maxsize=1)
def _build_engine() -> ForecastEngine:
    paths = _paths()
    os.environ.setdefault("HF_HOME", str(paths.models_cache))
    os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
    # The pinned weights are already in models_cache; never reach out to the Hub at runtime.
    os.environ.setdefault("HF_HUB_OFFLINE", "1")
    store = load_series(paths)
    # Chronos results computed offline: same forecasts without PyTorch in memory.
    model = load_precomputed(store) or default_model(paths.models_cache)
    return ForecastEngine(store, model)


def get_engine() -> ForecastEngine:
    """The single engine; the warm-up thread and requests never build two."""
    with _engine_lock:
        return _build_engine()


def warm_up_in_background() -> None:
    """Load the series and the model, and compute the forecasts, without blocking startup."""

    def run() -> None:
        try:
            get_engine().warm_up()
            logger.info("Sistema de pronostico listo (%s).", get_engine().model.name)
        except Exception:
            logger.exception("No se pudo preparar el sistema de pronostico.")
        finally:
            _warming_up.clear()

    _warming_up.set()
    threading.Thread(target=run, name="forecast-warm-up", daemon=True).start()


def _ready_engine_or_503(*levels: str) -> ForecastEngine:
    """Answer at once instead of waiting for the warm-up (callers have short timeouts)."""
    if _warming_up.is_set() and _engine_lock.locked():
        # The warm-up is still loading the series.
        raise HTTPException(
            status_code=503,
            detail="El sistema de pronostico se esta preparando. Intenta en unos segundos.",
            headers={"Retry-After": str(WARM_UP_RETRY_SECONDS)},
        )
    engine = _engine_or_503()
    if _warming_up.is_set() and not all(engine.is_ready(level) for level in levels):
        raise HTTPException(
            status_code=503,
            detail="El sistema de pronostico se esta preparando. Intenta en unos segundos.",
            headers={"Retry-After": str(WARM_UP_RETRY_SECONDS)},
        )
    return engine


def _engine_or_503() -> ForecastEngine:
    try:
        return get_engine()
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=503, detail="Datos del sistema de pronostico no disponibles."
        ) from error


@router.get("/health")
def health() -> dict[str, Any]:
    engine = _engine_or_503()
    return {
        "status": "ok",
        "service": "forecast",
        "model": engine.model.name,
        "lastObservedMonth": engine.store.last_month.strftime("%Y-%m"),
    }


@router.get("/overview")
def overview() -> dict[str, Any]:
    # Only the months of the series: no forecast is computed (or waited for) here.
    engine = _ready_engine_or_503()
    return {
        "model": engine.model.name,
        "lastObservedMonth": engine.store.last_month.strftime("%Y-%m"),
        "firstForecastMonth": engine.first_forecast_month.strftime("%Y-%m"),
        "lastForecastMonth": engine.last_forecast_month.strftime("%Y-%m"),
        "defaultMonth": engine.default_month().strftime("%Y-%m"),
        "maxHorizon": MAX_HORIZON,
        "validatedHorizon": VALIDATED_HORIZON,
        "sensitivityHorizon": SENSITIVITY_HORIZON,
    }


@router.get("/month")
def month_forecast(
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    threshold: float | None = Query(default=None, ge=0, le=100000),
) -> dict[str, Any]:
    # During the warm-up a request would hold a worker thread until Chronos finishes.
    engine = _ready_engine_or_503("total", "category")
    try:
        target = engine.parse_month(month)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return engine.month_forecast(target, threshold)


@router.post("/stock-coverage")
def stock_coverage(payload: StockCoverageRequest) -> dict[str, Any]:
    engine = _ready_engine_or_503("category")
    try:
        target = engine.parse_month(payload.month) if payload.month else None
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return engine.stock_coverage({c.category: c.stock for c in payload.categories}, target)


@router.get("/research")
def research() -> dict[str, Any]:
    engine = _engine_or_503()
    try:
        return engine.research(lambda: research_summary(_paths(), engine.store))
    except FileNotFoundError as error:
        logger.warning("Resultados de la tesis no disponibles: %s", error)
        raise HTTPException(
            status_code=503, detail="Resultados del sistema de pronostico no disponibles."
        ) from error
