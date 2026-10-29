"""Gradient-boosting models trained across the panel at each origin (plan Table 20).

* ``TwoStageGBM`` (Fu et al., 2026): an occurrence classifier and a size regressor pooled across
  series without identity; forecast = P(sale) x expected size.
* ``GlobalGBM`` (Montero-Manso and Hyndman, 2021): one Tweedie regressor over the whole panel with
  the series identifier as a categorical feature.

Both receive only the training histories of every series up to the same origin. LightGBM runs
with fixed seeds, ``deterministic`` and a fixed number of threads.

LightGBM is imported only when a model is trained, so processes that never train one (the
Chronos worker, see ``models/foundation.py``) never load its OpenMP runtime.
"""

from __future__ import annotations

import time
from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

import numpy as np

from pcsforecast.features.lagged import FEATURE_NAMES, Design, build_design, stack_designs
from pcsforecast.models.base import FloatArray, check_history

if TYPE_CHECKING:
    import lightgbm as lgb

DEFAULT_PARAMS: dict[str, Any] = {
    "learning_rate": 0.05,
    "num_leaves": 15,
    "min_data_in_leaf": 20,
    "feature_fraction": 0.9,
    "lambda_l2": 1.0,
    "num_threads": 2,
    "deterministic": True,
    "force_row_wise": True,
    "seed": 20260101,
    "verbose": -1,
}
DEFAULT_ROUNDS = 150
MIN_TRAIN_ROWS = 10


def _params(overrides: Mapping[str, float], **extra: Any) -> dict[str, Any]:
    params = {**DEFAULT_PARAMS, **extra}
    params.update({k: v for k, v in overrides.items() if k != "rounds"})
    for integer in ("num_leaves", "min_data_in_leaf", "num_threads", "seed"):
        params[integer] = int(params[integer])
    return params


def _designs(histories: Mapping[str, FloatArray], horizon: int) -> dict[str, Design]:
    for history in histories.values():
        check_history(history)
    return {key: build_design(history, horizon) for key, history in histories.items()}


def _fallback(designs: Mapping[str, Design], horizon: int) -> dict[str, FloatArray]:
    """Mean of the history when there is too little data to train (flat, non-negative)."""
    return {
        key: np.full(horizon, design.scale if design.scale > 0 else 0.0)
        for key, design in designs.items()
    }


@dataclass
class FitClock:
    """Seconds spent fitting (training) across calls; read by the runner for Table 30 times."""

    seconds: float = 0.0

    def train(self, library: Any, *args: Any) -> lgb.Booster:
        started = time.perf_counter()
        booster: lgb.Booster = library.train(*args)
        self.seconds += time.perf_counter() - started
        return booster


def _predict(model: lgb.Booster | None, rows: FloatArray, default: float) -> FloatArray:
    """Model predictions, or a constant when the stage could not be trained."""
    if model is None:
        return np.full(rows.shape[0], default, dtype=np.float64)
    return np.asarray(model.predict(rows), dtype=np.float64)


def _rescale(
    designs: Mapping[str, Design], predictions: Mapping[str, FloatArray], horizon: int
) -> dict[str, FloatArray]:
    out = {}
    for key, design in designs.items():
        values = predictions.get(key)
        if values is None or values.size != horizon:
            values = np.zeros(horizon)
        out[key] = np.clip(values, 0.0, None) * design.scale
    return out


@dataclass(frozen=True)
class TwoStageGBM:
    params: Mapping[str, float] = field(default_factory=dict)
    clock: FitClock = field(default_factory=FitClock, compare=False, repr=False)
    name: str = "two_stage_trees"
    family: str = "machine_learning"

    @property
    def fit_seconds(self) -> float:
        """Training time across origins (the rest of the run is preparation and inference)."""
        return self.clock.seconds

    def forecast_panel(
        self, histories: Mapping[str, FloatArray], horizon: int
    ) -> dict[str, FloatArray]:
        import lightgbm as lgb  # noqa: PLC0415 (lazy: see the module docstring)

        designs = _designs(histories, horizon)
        ordered = list(designs.values())
        x, y, _ = stack_designs(ordered, with_series_code=False)
        if y.size < MIN_TRAIN_ROWS:
            return _fallback(designs, horizon)
        rounds = int(self.params.get("rounds", DEFAULT_ROUNDS))
        occurred = (y > 0).astype(np.float64)
        probability_model = None
        if 0.0 < occurred.mean() < 1.0:
            probability_model = self.clock.train(
                lgb,
                _params(self.params, objective="binary"),
                lgb.Dataset(x, occurred, feature_name=list(FEATURE_NAMES)),
                rounds,
            )
        positive = y > 0
        size_model = None
        if positive.sum() >= MIN_TRAIN_ROWS:
            size_model = self.clock.train(
                lgb,
                _params(self.params, objective="regression"),
                lgb.Dataset(x[positive], y[positive], feature_name=list(FEATURE_NAMES)),
                rounds,
            )
        mean_size = float(y[positive].mean()) if positive.any() else 0.0
        predictions = {}
        for key, design in designs.items():
            rows = design.x_predict
            if rows.shape[0] == 0:
                continue
            probability = _predict(probability_model, rows, float(occurred.mean()))
            size = _predict(size_model, rows, mean_size)
            predictions[key] = probability * size
        return _rescale(designs, predictions, horizon)


@dataclass(frozen=True)
class GlobalGBM:
    params: Mapping[str, float] = field(default_factory=dict)
    clock: FitClock = field(default_factory=FitClock, compare=False, repr=False)
    name: str = "global_gbm"
    family: str = "machine_learning"

    @property
    def fit_seconds(self) -> float:
        """Training time across origins (the rest of the run is preparation and inference)."""
        return self.clock.seconds

    def forecast_panel(
        self, histories: Mapping[str, FloatArray], horizon: int
    ) -> dict[str, FloatArray]:
        import lightgbm as lgb  # noqa: PLC0415 (lazy: see the module docstring)

        designs = _designs(histories, horizon)
        ordered = list(designs.values())
        x, y, _ = stack_designs(ordered, with_series_code=True)
        if y.size < MIN_TRAIN_ROWS or not (y > 0).any():
            return _fallback(designs, horizon)
        names = [*FEATURE_NAMES, "series"]
        model = self.clock.train(
            lgb,
            _params(self.params, objective="tweedie", tweedie_variance_power=1.5),
            lgb.Dataset(x, y, feature_name=names, categorical_feature=["series"]),
            int(self.params.get("rounds", DEFAULT_ROUNDS)),
        )
        predictions = {}
        for code, (key, design) in enumerate(designs.items()):
            rows = design.x_predict
            if rows.shape[0] == 0:
                continue
            coded = np.column_stack([rows, np.full(rows.shape[0], code, dtype=np.float64)])
            predictions[key] = np.asarray(model.predict(coded), dtype=np.float64)
        return _rescale(designs, predictions, horizon)
