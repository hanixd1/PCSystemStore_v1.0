"""Common model interface: every model sees only the training values up to the origin."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Protocol, runtime_checkable

import numpy as np
import numpy.typing as npt

FloatArray = npt.NDArray[np.float64]


class Forecaster(Protocol):
    """A model that maps a training history to point forecasts for horizons 1..h."""

    @property
    def name(self) -> str: ...

    @property
    def family(self) -> str: ...

    def forecast(self, history: FloatArray, horizon: int) -> FloatArray:
        """Point forecasts for the ``horizon`` periods after the last value of ``history``."""
        ...


@runtime_checkable
class PanelForecaster(Protocol):
    """A model trained across all series at one origin (global models)."""

    @property
    def name(self) -> str: ...

    @property
    def family(self) -> str: ...

    def forecast_panel(
        self, histories: Mapping[str, FloatArray], horizon: int
    ) -> dict[str, FloatArray]:
        """Point forecasts for every series, from their histories up to the same origin."""
        ...


AnyForecaster = Forecaster | PanelForecaster


def check_history(history: FloatArray) -> None:
    if history.ndim != 1 or history.size == 0:
        raise ValueError("history must be a non-empty one-dimensional array")
    if not np.isfinite(history).all() or (history < 0).any():
        raise ValueError("history must be finite and non-negative")
