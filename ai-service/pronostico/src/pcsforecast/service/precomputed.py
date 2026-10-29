"""Chronos quantiles computed once, offline, and served without PyTorch.

The series are monthly: the forecasts only change when a new month is added. Loading PyTorch
and Chronos in the ai-service would cost hundreds of MB of RAM all month long for numbers that
can be computed once on the research machine:

    python -m pcsforecast.service.fit          # fine-tune on the full history (optional)
    python -m pcsforecast.service.precomputed # writes precomputed_quantiles.json
    python -m pcsforecast.service.bundle <dir> # copies it with the series

``precomputed_quantiles.json`` sits next to the served series. The service uses it when it
matches the series it serves (same last month, context window and horizon); otherwise it falls
back to the live model (Chronos if installed, SES otherwise). Run it in its own process: PyTorch
must not share a process with LightGBM (ADR-0009).
"""

from __future__ import annotations

import json
import logging
import time
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from pcsforecast.models.base import FloatArray
from pcsforecast.paths import project_paths
from pcsforecast.service.data import CONTEXT_MONTHS, SeriesStore, load_series
from pcsforecast.service.forecast import MAX_HORIZON, QUANTILES, QuantileModel, default_model

logger = logging.getLogger(__name__)

PRECOMPUTED_FILE = "precomputed_quantiles.json"
PRECOMPUTED_LEVELS = ("total", "category")
FORMAT_VERSION = 1


@dataclass(frozen=True)
class PrecomputedQuantiles:
    """Quantile paths read from disk; looked up by series key, never recomputed."""

    name: str
    by_level: dict[str, dict[str, np.ndarray]]

    def quantile_paths(self, level: str, keys: Sequence[str]) -> list[np.ndarray]:
        stored = self.by_level[level]
        return [stored[key] for key in keys]

    def quantiles(self, contexts: Sequence[FloatArray], horizon: int) -> np.ndarray:
        raise NotImplementedError("Precomputed quantiles are looked up by key (quantile_paths).")


def _month(store: SeriesStore) -> str:
    return store.last_month.strftime("%Y-%m")


def export_precomputed(root: Path | None = None, model: QuantileModel | None = None) -> Path:
    """Compute the total and category paths with ``model`` (Chronos by default) and save them."""
    paths = project_paths(root)
    store = load_series(paths)
    model = model or default_model(paths.models_cache)
    by_level: dict[str, dict[str, list[list[float]]]] = {}
    started = time.perf_counter()
    for level in PRECOMPUTED_LEVELS:
        histories = store.histories(level, context=CONTEXT_MONTHS)
        keys = list(histories)
        values = model.quantiles([histories[key] for key in keys], MAX_HORIZON)
        by_level[level] = {
            key: np.round(path, 4).tolist() for key, path in zip(keys, values, strict=True)
        }
    target = store.source / PRECOMPUTED_FILE
    target.write_text(
        json.dumps(
            {
                "version": FORMAT_VERSION,
                "model": model.name,
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
                "seconds": round(time.perf_counter() - started, 2),
                "last_month": _month(store),
                "context_months": CONTEXT_MONTHS,
                "max_horizon": MAX_HORIZON,
                "quantiles": list(QUANTILES),
                "levels": by_level,
            }
        ),
        encoding="utf-8",
    )
    return target


def _matches(document: dict[str, Any], store: SeriesStore) -> str | None:
    """Why the file cannot be used with ``store`` (None when it can)."""
    expected = {
        "version": FORMAT_VERSION,
        "last_month": _month(store),
        "context_months": CONTEXT_MONTHS,
        "max_horizon": MAX_HORIZON,
        "quantiles": list(QUANTILES),
    }
    for field, value in expected.items():
        if document.get(field) != value:
            return f"{field}={document.get(field)!r} (se esperaba {value!r})"
    levels = document.get("levels") or {}
    for level in PRECOMPUTED_LEVELS:
        missing = set(store.histories(level)) - set(levels.get(level, {}))
        if missing:
            return f"faltan series {sorted(missing)[:3]} en {level}"
    return None


def load_precomputed(store: SeriesStore) -> PrecomputedQuantiles | None:
    """The precomputed model for ``store``, or None (absent, stale or malformed)."""
    path = store.source / PRECOMPUTED_FILE
    if not path.is_file():
        return None
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
        problem = _matches(document, store)
        if problem:
            logger.warning("Cuantiles precalculados ignorados: %s.", problem)
            return None
        by_level = {
            level: {
                key: np.asarray(values, dtype=np.float64)
                for key, values in document["levels"][level].items()
            }
            for level in PRECOMPUTED_LEVELS
        }
    except (ValueError, KeyError, TypeError) as error:
        logger.warning("Cuantiles precalculados ilegibles: %s.", error)
        return None
    shape = (MAX_HORIZON, len(QUANTILES))
    if any(path.shape != shape for paths in by_level.values() for path in paths.values()):
        logger.warning("Cuantiles precalculados con forma inesperada: se ignoran.")
        return None
    return PrecomputedQuantiles(name=str(document["model"]), by_level=by_level)


if __name__ == "__main__":  # pragma: no cover
    print(export_precomputed())
