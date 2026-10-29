"""Baselines (Naive, SES) and intermittent-demand methods (Croston, SBA, TSB).

Plain NumPy implementations of the textbook recursions, so every equation is visible and
unit-tested. All produce flat forecasts over the horizon, as in the cited methods.
"""

from __future__ import annotations

from dataclasses import dataclass
from itertools import pairwise
from typing import Literal

import numpy as np

from pcsforecast.models.base import FloatArray, check_history

DEFAULT_ALPHA_GRID = tuple(round(a, 2) for a in np.arange(0.05, 1.0, 0.05))


def _flat(value: float, horizon: int) -> FloatArray:
    return np.full(horizon, max(value, 0.0), dtype=np.float64)


@dataclass(frozen=True)
class Naive:
    """Last observed value (Hyndman, 2006)."""

    name: str = "naive"
    family: str = "baseline"

    def forecast(self, history: FloatArray, horizon: int) -> FloatArray:
        check_history(history)
        return _flat(float(history[-1]), horizon)


def ses_level(history: FloatArray, alpha: float) -> tuple[float, float]:
    """Final SES level and the sum of squared one-step errors, initialised at the first value."""
    level = float(history[0])
    sse = 0.0
    for value in history[1:]:
        error = float(value) - level
        sse += error * error
        level += alpha * error
    return level, sse


@dataclass(frozen=True)
class SES:
    """Simple exponential smoothing; alpha minimises in-sample one-step squared error."""

    alpha_grid: tuple[float, ...] = DEFAULT_ALPHA_GRID
    name: str = "ses"
    family: str = "baseline"

    def forecast(self, history: FloatArray, horizon: int) -> FloatArray:
        check_history(history)
        best = min(self.alpha_grid, key=lambda a: (ses_level(history, a)[1], a))
        return _flat(ses_level(history, best)[0], horizon)


def croston_estimates(history: FloatArray, alpha: float) -> tuple[float, float] | None:
    """Smoothed demand size and inter-demand interval; ``None`` if nothing was ever sold."""
    positions = np.flatnonzero(history > 0)
    if positions.size == 0:
        return None
    size = float(history[positions[0]])
    interval = float(positions[0] + 1)
    for previous, current in pairwise(positions):
        size += alpha * (float(history[current]) - size)
        interval += alpha * (float(current - previous) - interval)
    return size, interval


@dataclass(frozen=True)
class Croston:
    """Croston (1972): size / interval, both smoothed with a common alpha."""

    alpha: float = 0.1
    debias: bool = False
    name: str = "croston"
    family: str = "intermittent"

    def forecast(self, history: FloatArray, horizon: int) -> FloatArray:
        check_history(history)
        estimates = croston_estimates(history, self.alpha)
        if estimates is None:
            return _flat(0.0, horizon)
        size, interval = estimates
        factor = 1.0 - self.alpha / 2.0 if self.debias else 1.0
        return _flat(factor * size / interval, horizon)


def sba(alpha: float = 0.1) -> Croston:
    """Syntetos-Boylan approximation: Croston with the (1 - alpha/2) correction."""
    return Croston(alpha=alpha, debias=True, name="sba")


@dataclass(frozen=True)
class TSB:
    """Teunter-Syntetos-Babai (2011): demand probability updated every period.

    The probability starts at the share of periods with demand in the training window
    (``"mean"``, the declared initialisation) or at the first period's occurrence (``"first"``,
    as in statsforecast; used by the reference cross-check).
    """

    alpha_d: float = 0.1
    alpha_p: float = 0.1
    probability_init: Literal["mean", "first"] = "mean"
    name: str = "tsb"
    family: str = "intermittent"

    def forecast(self, history: FloatArray, horizon: int) -> FloatArray:
        check_history(history)
        positions = np.flatnonzero(history > 0)
        if positions.size == 0:
            return _flat(0.0, horizon)
        size = float(history[positions[0]])
        if self.probability_init == "mean":
            probability = float(positions.size / history.size)
        else:
            probability = float(history[0] > 0)
        for value in history:
            occurred = value > 0
            probability += self.alpha_p * (float(occurred) - probability)
            if occurred:
                size += self.alpha_d * (float(value) - size)
        return _flat(probability * size, horizon)
