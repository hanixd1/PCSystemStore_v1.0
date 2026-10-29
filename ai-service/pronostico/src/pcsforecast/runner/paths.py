"""Forecast paths of one model for every series and origin, local or panel-wide.

All series of a frequency share the same calendar, so an origin position means the same period
for every series. Local models are called per series; panel models once per origin with the
training histories of every series cut at that origin.
"""

from __future__ import annotations

import time
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field

from pcsforecast.config import Window
from pcsforecast.models.base import AnyForecaster, FloatArray, PanelForecaster
from pcsforecast.protocol.origins import TrainView

Paths = dict[str, dict[int, FloatArray]]


@dataclass
class PathResult:
    paths: Paths = field(default_factory=dict)
    failures: list[dict[str, object]] = field(default_factory=list)
    # Time spent cutting the training views (preparation, Table 30).
    preparation_seconds: float = 0.0


def common_length(series: Mapping[str, FloatArray]) -> int:
    lengths = {values.size for values in series.values()}
    if len(lengths) != 1:
        raise ValueError(f"series of one frequency must share the calendar, got {lengths}")
    return lengths.pop()


def forecast_paths(
    model: AnyForecaster,
    series: Mapping[str, FloatArray],
    origins: Sequence[int],
    window: Window,
    horizon: int,
) -> PathResult:
    """Forecasts for horizons 1..``horizon`` at every origin; failures are logged, not raised."""
    result = PathResult({key: {} for key in series})

    def view(values: FloatArray, origin: int) -> FloatArray:
        started = time.perf_counter()
        history = TrainView.at(values, origin, window.primary, window.length).history
        result.preparation_seconds += time.perf_counter() - started
        return history

    for origin in origins:
        if isinstance(model, PanelForecaster):
            try:
                panel = model.forecast_panel(
                    {key: view(values, origin) for key, values in series.items()}, horizon
                )
            except (ValueError, ArithmeticError) as error:
                result.failures.append(
                    {"series_id": "*", "model": model.name, "origin": origin, "error": repr(error)}
                )
                continue
            for key, path in panel.items():
                result.paths[key][origin] = path
            continue
        for key, values in series.items():
            try:
                result.paths[key][origin] = model.forecast(view(values, origin), horizon)
            except (ValueError, ArithmeticError) as error:
                result.failures.append(
                    {"series_id": key, "model": model.name, "origin": origin, "error": repr(error)}
                )
    return result
