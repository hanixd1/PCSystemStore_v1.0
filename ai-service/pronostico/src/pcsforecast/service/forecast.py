"""Quantile forecasts for a target month and the sale probabilities derived from them.

Model choice follows the thesis results (F10, HE1): Chronos with light fine-tuning is the most
accurate model on the total and category series, so it serves those levels; when PyTorch is not
installed the service falls back to SES with empirical error quantiles. SKU series are
intermittent, so their probability of selling at least one unit in a month comes from TSB, the
method that smooths that probability directly (Teunter, Syntetos & Babai, 2011).

Accuracy was validated at a one-month horizon (three months as sensitivity). Farther months are
served too, but they are marked as extrapolations.
"""

from __future__ import annotations

import logging
import threading
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal, Protocol

import numpy as np
import pandas as pd

from pcsforecast.models.base import FloatArray
from pcsforecast.models.statistical import DEFAULT_ALPHA_GRID, ses_level
from pcsforecast.service.data import CONTEXT_MONTHS, TOTAL_KEY, SeriesStore

logger = logging.getLogger(__name__)

QUANTILES = (0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9)
MEDIAN_INDEX = QUANTILES.index(0.5)
MAX_HORIZON = 12
VALIDATED_HORIZON = 1
SENSITIVITY_HORIZON = 3
# Frozen monthly TSB parameters (tuned.yaml).
TSB_ALPHA_D = 0.3
TSB_ALPHA_P = 0.3
CHRONOS_REPO = "amazon/chronos-bolt-small"
CHRONOS_REVISION = "772f3d25d38aec6d914c8949dab4462e2d46f5d8"
TUNED_DIRNAME = "service/chronos_fine_tuned"

MONTH_TEXT_LENGTH = len("YYYY-MM")
# Stockout probability from which a category is at each risk level.
RISK_LEVELS = (("CRITICAL", 0.7), ("HIGH", 0.4), ("MEDIUM", 0.2))

Bound = Literal["within", "above", "below"]
Reliability = Literal["validated", "sensitivity", "extrapolation"]

# Web store category -> thesis category (catalog.yaml). Several web categories share one series.
WEB_CATEGORY_MAP: dict[str, str] = {
    "CPU": "cpu",
    "MOTHERBOARD": "motherboard",
    "RAM": "memory",
    "GPU": "gpu",
    "STORAGE": "storage",
    "PSU": "psu",
    "CASE": "case",
    "COOLER": "cooling",
    "LAPTOP_COOLING_BASE": "cooling",
    "MONITOR": "monitor",
    "KEYBOARD": "keyboard_mouse",
    "MOUSE": "keyboard_mouse",
    "MOUSEPAD": "keyboard_mouse",
    "HEADSET": "audio",
    "MICROPHONE": "audio",
    "SPEAKER": "audio",
    "UPS": "power_protection",
    "STABILIZER": "power_protection",
    "PROTECTION": "power_protection",
    "CABLE_HUB": "accessory",
    "WEBCAM": "accessory",
    "CAPTURE_CARD": "accessory",
    "BACKPACK": "accessory",
    # catalog.yaml puts chairs (SILLA) under accessories.
    "CHAIR": "accessory",
    # No thesis category of their own: catalog.yaml sends them to the fallback "other".
    "LAPTOP": "other",
    "PC_DESKTOP": "other",
    "GAMING_DESK": "other",
    "SOFTWARE": "other",
}


class QuantileModel(Protocol):
    @property
    def name(self) -> str: ...

    def quantiles(self, contexts: Sequence[FloatArray], horizon: int) -> np.ndarray:
        """Array (series, horizon, len(QUANTILES)), non-negative and non-decreasing."""
        ...


def _tidy(values: np.ndarray) -> np.ndarray:
    return np.sort(np.clip(values, 0.0, None), axis=-1)


@dataclass
class ChronosQuantiles:
    """Chronos-Bolt quantiles; the service fine-tuned weights when ``pcs service-fit`` ran."""

    models_cache: Path
    _pipeline: Any = field(default=None, init=False, repr=False)
    _name: str = field(default="chronos_zero_shot", init=False)
    _lock: threading.Lock = field(default_factory=threading.Lock, init=False, repr=False)

    @property
    def name(self) -> str:
        if self._pipeline is None and (self.tuned_dir / "config.json").is_file():
            return "chronos_fine_tuned"
        return self._name

    @property
    def tuned_dir(self) -> Path:
        return self.models_cache / TUNED_DIRNAME

    def _load(self) -> Any:
        with self._lock:
            if self._pipeline is None:
                import torch  # noqa: PLC0415 (optional heavy dependency)
                from chronos import BaseChronosPipeline  # noqa: PLC0415

                from pcsforecast.models.foundation import load_chronos  # noqa: PLC0415

                torch.manual_seed(0)
                if (self.tuned_dir / "config.json").is_file():
                    self._pipeline = BaseChronosPipeline.from_pretrained(
                        str(self.tuned_dir), device_map="cpu", torch_dtype=torch.float32
                    )
                    self._name = "chronos_fine_tuned"
                else:
                    self._pipeline = load_chronos(CHRONOS_REPO, CHRONOS_REVISION)
                    self._name = "chronos_zero_shot"
            return self._pipeline

    def quantiles(self, contexts: Sequence[FloatArray], horizon: int) -> np.ndarray:
        import torch  # noqa: PLC0415

        pipeline = self._load()
        values, _ = pipeline.predict_quantiles(
            [torch.tensor(c, dtype=torch.float32) for c in contexts],
            prediction_length=horizon,
            quantile_levels=list(QUANTILES),
        )
        return _tidy(np.asarray(values, dtype=np.float64))


@dataclass(frozen=True)
class StatisticalQuantiles:
    """SES point forecast with the empirical quantiles of its one-step errors, scaled by sqrt(h)."""

    name: str = "ses"

    def quantiles(self, contexts: Sequence[FloatArray], horizon: int) -> np.ndarray:
        result = np.zeros((len(contexts), horizon, len(QUANTILES)))
        steps = np.sqrt(np.arange(1, horizon + 1))[:, None]
        for row, history in enumerate(contexts):
            alpha = min(DEFAULT_ALPHA_GRID, key=lambda a: (ses_level(history, a)[1], a))
            level, errors = float(history[0]), []
            for value in history[1:]:
                errors.append(float(value) - level)
                level += alpha * (float(value) - level)
            spread = np.quantile(errors, QUANTILES) if errors else np.zeros(len(QUANTILES))
            result[row] = level + steps * spread[None, :]
        return _tidy(result)


def default_model(models_cache: Path) -> QuantileModel:
    """Chronos when PyTorch and chronos-forecasting are installed, otherwise SES."""
    try:
        import chronos  # noqa: F401, PLC0415
        import torch  # noqa: F401, PLC0415
    except ImportError:
        logger.warning("Chronos no instalado: el pronostico usa SES como respaldo.")
        return StatisticalQuantiles()
    return ChronosQuantiles(models_cache)


# --- probabilities -------------------------------------------------------------------------


def probability_at_least(quantiles: np.ndarray, units: float) -> tuple[float, Bound]:
    """P(demand >= units) from the forecast quantiles (continuity correction for counts).

    Inside the 10-90 % band the CDF is interpolated linearly; outside it only a bound is known,
    reported as 0.9 (``above``) or 0.1 (``below``).
    """
    if units <= 0:
        return 1.0, "within"
    x = units - 0.5
    if x <= quantiles[0]:
        return round(1.0 - QUANTILES[0], 4), "above"
    if x >= quantiles[-1]:
        return round(1.0 - QUANTILES[-1], 4), "below"
    cdf = float(np.interp(x, quantiles, QUANTILES))
    return round(1.0 - cdf, 4), "within"


def tsb_probability(history: FloatArray) -> tuple[float, float]:
    """TSB probability of a sale in a period and smoothed size of a sale (0, 0 if never sold)."""
    positions = np.flatnonzero(history > 0)
    if positions.size == 0:
        return 0.0, 0.0
    size = float(history[positions[0]])
    probability = float(positions.size / history.size)
    for value in history:
        occurred = value > 0
        probability += TSB_ALPHA_P * (float(occurred) - probability)
        if occurred:
            size += TSB_ALPHA_D * (float(value) - size)
    return probability, size


def reliability(horizon: int) -> Reliability:
    if horizon <= VALIDATED_HORIZON:
        return "validated"
    if horizon <= SENSITIVITY_HORIZON:
        return "sensitivity"
    return "extrapolation"


def _month(value: pd.Timestamp) -> str:
    return value.strftime("%Y-%m")


def _band(values: np.ndarray) -> dict[str, float]:
    return {
        "p10": round(float(values[0]), 1),
        "p25": round(float(np.interp(0.25, QUANTILES, values)), 1),
        "median": round(float(values[MEDIAN_INDEX]), 1),
        "p75": round(float(np.interp(0.75, QUANTILES, values)), 1),
        "p90": round(float(values[-1]), 1),
    }


# --- engine --------------------------------------------------------------------------------


@dataclass
class ForecastEngine:
    store: SeriesStore
    model: QuantileModel
    _cache: dict[str, dict[str, np.ndarray]] = field(default_factory=dict, init=False, repr=False)
    _lock: threading.Lock = field(default_factory=threading.Lock, init=False, repr=False)
    # SKU probabilities depend only on the histories, never on the month or the threshold.
    _products: list[dict[str, Any]] | None = field(default=None, init=False, repr=False)
    _research: dict[str, Any] | None = field(default=None, init=False, repr=False)
    # Separate from _lock: building these must not wait for (or block) the model forecasts.
    _derived_lock: threading.Lock = field(default_factory=threading.Lock, init=False, repr=False)

    @property
    def first_forecast_month(self) -> pd.Timestamp:
        return self.store.last_month + pd.DateOffset(months=1)

    @property
    def last_forecast_month(self) -> pd.Timestamp:
        return self.store.last_month + pd.DateOffset(months=MAX_HORIZON)

    def horizon(self, month: pd.Timestamp) -> int:
        last = self.store.last_month
        return (month.year - last.year) * 12 + (month.month - last.month)

    def _paths(self, level: str) -> dict[str, np.ndarray]:
        """Quantile paths (horizon x quantile) of every series of ``level``, computed once."""
        with self._lock:
            if level not in self._cache:
                histories = self.store.histories(level, context=CONTEXT_MONTHS)
                keys = list(histories)
                # Precomputed models (service.precomputed) are looked up by key, not computed.
                lookup = getattr(self.model, "quantile_paths", None)
                values = (
                    lookup(level, keys)
                    if callable(lookup)
                    else self.model.quantiles([histories[k] for k in keys], MAX_HORIZON)
                )
                self._cache[level] = dict(zip(keys, values, strict=True))
            return self._cache[level]

    def warm_up(self) -> None:
        self._paths("total")
        self._paths("category")

    def is_ready(self, level: str) -> bool:
        """Whether the forecasts of ``level`` are computed (reading them will not block)."""
        return level in self._cache

    def default_month(self, today: pd.Timestamp | None = None) -> pd.Timestamp:
        """Next calendar month, inside the forecast range."""
        today = today or pd.Timestamp.today()
        candidate = pd.Timestamp(year=today.year, month=today.month, day=1) + pd.DateOffset(
            months=1
        )
        return min(max(candidate, self.first_forecast_month), self.last_forecast_month)

    def parse_month(self, value: str | None) -> pd.Timestamp:
        if not value:
            return self.default_month()
        text = f"{value}-01" if len(value) == MONTH_TEXT_LENGTH else value
        month = pd.Timestamp(text)
        month = pd.Timestamp(year=month.year, month=month.month, day=1)
        if not self.first_forecast_month <= month <= self.last_forecast_month:
            raise ValueError(
                f"El mes debe estar entre {_month(self.first_forecast_month)} y "
                f"{_month(self.last_forecast_month)}."
            )
        return month

    def _history_units(self, level: str, key: str, month: pd.Timestamp) -> float | None:
        rows = self.store.history(level, key)
        match = rows[rows["period_start"] == month]
        return None if match.empty else float(match["units"].iloc[0])

    def month_forecast(
        self, month: pd.Timestamp, threshold: float | None = None, top: int = 12
    ) -> dict[str, Any]:
        horizon = self.horizon(month)
        step = horizon - 1
        total_path = self._paths("total")[TOTAL_KEY]
        target = total_path[step]
        last_year = month - pd.DateOffset(years=1)
        last_year_units = self._history_units("total", TOTAL_KEY, last_year)

        def probability(units: float) -> dict[str, Any]:
            value, bound = probability_at_least(target, units)
            return {"units": units, "probability": value, "bound": bound}

        thresholds = sorted({round(float(target[i])) for i in (0, 2, MEDIAN_INDEX, 6, 8)} - {0})
        if threshold is not None and threshold > 0:
            thresholds = sorted({*thresholds, round(threshold)})
        categories = self._category_rows(step, month)
        history = self.store.history("total", TOTAL_KEY)
        return {
            "month": _month(month),
            "horizon": horizon,
            "reliability": reliability(horizon),
            "model": self.model.name,
            "lastObservedMonth": _month(self.store.last_month),
            "total": {
                **_band(target),
                "probabilities": [probability(u) for u in thresholds],
                "requested": probability(threshold) if threshold else None,
                "sameMonthLastYear": {
                    "month": _month(last_year),
                    "units": last_year_units,
                    "probabilityAbove": (
                        probability(last_year_units + 1) if last_year_units is not None else None
                    ),
                },
            },
            "path": [
                {
                    "month": _month(self.store.last_month + pd.DateOffset(months=i + 1)),
                    **_band(total_path[i]),
                }
                for i in range(horizon)
            ],
            "history": [
                {"month": month, "units": int(units)}
                for month, units in zip(
                    history["period_start"].dt.strftime("%Y-%m").tolist(),
                    history["units"].tolist(),
                    strict=True,
                )
            ],
            "categories": categories,
            "products": self._product_rows(top),
        }

    def _category_rows(self, step: int, month: pd.Timestamp) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        paths = self._paths("category")
        medians_sum = sum(float(p[step][MEDIAN_INDEX]) for p in paths.values()) or 1.0
        for key, path in paths.items():
            values = path[step]
            last_year = self._history_units("category", key, month - pd.DateOffset(years=1))
            rows.append(
                {
                    "key": key,
                    "label": self.store.category_label(key),
                    **_band(values),
                    "share": round(float(values[MEDIAN_INDEX]) / medians_sum, 4),
                    "probabilityAtLeastOne": probability_at_least(values, 1)[0],
                    "sameMonthLastYear": last_year,
                }
            )
        return sorted(rows, key=lambda r: -r["median"])

    def research(self, build: Callable[[], dict[str, Any]]) -> dict[str, Any]:
        """Thesis summary, read from disk once: its sources never change while serving."""
        # Double-checked: concurrent first requests build it once, later ones never lock.
        if self._research is None:
            with self._derived_lock:
                if self._research is None:
                    self._research = build()
        return self._research

    def _product_rows(self, top: int) -> list[dict[str, Any]]:
        if self._products is None:
            with self._derived_lock:
                if self._products is None:
                    self._products = self._all_product_rows()
        return self._products[:top]

    def _all_product_rows(self) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for key, history in self.store.histories("sku", context=CONTEXT_MONTHS).items():
            probability, size = tsb_probability(history)
            if probability <= 0:
                continue
            category = self.store.sku_categories.get(key, "other")
            rows.append(
                {
                    "name": self.store.sku_names.get(key, key),
                    "category": self.store.category_label(category),
                    "probabilityOfSale": round(probability, 4),
                    "expectedUnits": round(probability * size, 2),
                    "unitsLast18Months": int(history.sum()),
                }
            )
        rows.sort(key=lambda r: (-r["probabilityOfSale"], -r["expectedUnits"]))
        return rows

    def stock_coverage(
        self, stock_by_web_category: Mapping[str, int], month: pd.Timestamp | None = None
    ) -> dict[str, Any]:
        """Per thesis category: forecast demand of ``month`` against the web stock."""
        month = month or self.default_month()
        step = self.horizon(month) - 1
        stock: dict[str, int] = {}
        for web_category, units in stock_by_web_category.items():
            key = WEB_CATEGORY_MAP.get(web_category.upper())
            if key is not None:
                stock[key] = stock.get(key, 0) + max(int(units), 0)
        paths = self._paths("category")
        items: list[dict[str, Any]] = []
        for key, units in sorted(stock.items()):
            if key not in paths:
                continue
            values = paths[key][step]
            probability, bound = probability_at_least(values, units + 1)
            median = float(values[MEDIAN_INDEX])
            items.append(
                {
                    "category": key,
                    "label": self.store.category_label(key),
                    "stock": units,
                    "forecastMedian": round(median, 1),
                    "forecastP90": round(float(values[-1]), 1),
                    "stockoutProbability": probability,
                    "bound": bound,
                    "coverageMonths": round(units / median, 1) if median > 0 else None,
                    "riskLevel": _risk_level(probability),
                    "suggestedReorder": max(0, round(float(values[-1]) - units)),
                }
            )
        items.sort(key=lambda r: -r["stockoutProbability"])
        return {
            "month": _month(month),
            "horizon": step + 1,
            "reliability": reliability(step + 1),
            "model": self.model.name,
            "lastObservedMonth": _month(self.store.last_month),
            "items": items,
        }


def _risk_level(probability: float) -> str:
    for level, threshold in RISK_LEVELS:
        if probability >= threshold:
            return level
    return "LOW"
