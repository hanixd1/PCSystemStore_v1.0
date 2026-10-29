"""Paired rolling-origin evaluation: same series, origins and horizons for every model."""

from __future__ import annotations

import time
from collections.abc import Sequence
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from pcsforecast.config import FrequencyProtocol
from pcsforecast.evaluation.metrics import naive_scales
from pcsforecast.models.base import AnyForecaster, FloatArray
from pcsforecast.protocol.origins import Origin, TrainView, validation_origins
from pcsforecast.runner.paths import Paths, common_length, forecast_paths


@dataclass
class EngineResult:
    predictions: pd.DataFrame
    seconds_by_model: dict[str, float]
    # Table 30 times per model: preparation, fit (None when fitting and forecasting are one
    # recursion, as in the statistical models) and inference.
    seconds_by_stage: dict[str, dict[str, float | None]] = field(default_factory=dict)
    failures: list[dict[str, object]] = field(default_factory=list)


def panel_series(
    panel: pd.DataFrame, series_ids: Sequence[str]
) -> tuple[dict[str, FloatArray], list[pd.Timestamp]]:
    """Units of each requested series on the shared calendar, and the period starts."""
    chosen = panel[panel["series_id"].isin(series_ids)].sort_values(["series_id", "period_start"])
    series: dict[str, FloatArray] = {}
    periods: list[pd.Timestamp] = []
    for series_id, frame in chosen.groupby("series_id"):
        series[str(series_id)] = frame["units"].to_numpy(dtype=np.float64)
        periods = list(frame["period_start"])
    return series, periods


def _rows(
    *,
    model: AnyForecaster,
    series: dict[str, FloatArray],
    periods: Sequence[pd.Timestamp],
    origins: Sequence[Origin],
    paths: Paths,
    protocol: FrequencyProtocol,
) -> list[dict[str, object]]:
    window = protocol.window
    rows: list[dict[str, object]] = []
    for key, values in series.items():
        for origin in origins:
            path = paths[key].get(origin.position)
            if path is None:
                continue
            history = TrainView.at(values, origin.position, window.primary, window.length).history
            scale_mae, scale_mse = naive_scales(history)
            for horizon in origin.horizons:
                rows.append(
                    {
                        "series_id": key,
                        "model": model.name,
                        "family": model.family,
                        "origin": periods[origin.position],
                        "horizon": horizon,
                        "target_period": periods[origin.position + horizon],
                        "y_true": float(values[origin.position + horizon]),
                        "y_hat": float(path[horizon - 1]),
                        "train_periods": int(history.size),
                        "scale_mae": scale_mae,
                        "scale_mse": scale_mse,
                    }
                )
    return rows


def fit_seconds(model: AnyForecaster, since: float | None = None) -> float | None:
    """Fitting time a model reports (``None`` when it does not fit separately)."""
    value = getattr(model, "fit_seconds", None)
    if not isinstance(value, float):
        return None
    return value - (since or 0.0)


def stage_seconds(total: float, preparation: float, fit: float | None) -> dict[str, float | None]:
    """Split a model's run time into preparation, fit and inference (seconds, 3 decimals)."""
    inference = total - preparation - (fit or 0.0)
    return {
        "preparation": round(preparation, 3),
        "fit": None if fit is None else round(fit, 3),
        "inference": round(max(inference, 0.0), 3),
    }


def run_engine(
    panel: pd.DataFrame,
    series_ids: Sequence[str],
    models: Sequence[AnyForecaster],
    protocol: FrequencyProtocol,
    origins: Sequence[Origin] | None = None,
) -> EngineResult:
    """Evaluate ``models`` on ``series_ids`` in ``panel``.

    By default the origins are the internal-validation origins of the development periods; the
    final test passes its own (``final_test_origins``).
    """
    series, periods = panel_series(panel, series_ids)
    result = EngineResult(pd.DataFrame(), {})
    if not series:
        return result
    if origins is None:
        origins = validation_origins(common_length(series), protocol)
    longest = max(protocol.horizons)
    rows: list[dict[str, object]] = []
    for model in models:
        before = fit_seconds(model)
        started = time.perf_counter()
        computed = forecast_paths(
            model, series, [o.position for o in origins], protocol.window, longest
        )
        total = time.perf_counter() - started
        result.seconds_by_model[model.name] = total
        result.seconds_by_stage[model.name] = stage_seconds(
            total, computed.preparation_seconds, fit_seconds(model, before)
        )
        result.failures.extend(computed.failures)
        rows.extend(
            _rows(
                model=model,
                series=series,
                periods=periods,
                origins=origins,
                paths=computed.paths,
                protocol=protocol,
            )
        )
    result.predictions = pd.DataFrame(rows)
    return result
