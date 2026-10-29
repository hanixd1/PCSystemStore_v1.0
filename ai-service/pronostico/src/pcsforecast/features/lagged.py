"""Lag, rolling and intermittence features with a direct multi-horizon design.

For a history ``y[0..T]`` (ending at the origin) each training sample takes the features known at
a position ``s`` and the target ``y[s + h]`` for a horizon ``h``, with ``s + h <= T``. Prediction
rows use the features at ``T`` for every horizon. Values are divided by the history's mean so
that series of different size can be pooled; the target is scaled the same way.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

from pcsforecast.models.base import FloatArray

LAGS = (1, 2, 3, 4)
WINDOWS = (4, 8, 13)
OCCURRENCE_WINDOW = 8
MIN_CONTEXT = max(LAGS)
FEATURE_NAMES = (
    *(f"lag_{k}" for k in LAGS),
    *(f"mean_{w}" for w in WINDOWS),
    f"occurrence_{OCCURRENCE_WINDOW}",
    "periods_since_sale",
    "mean_size",
    "horizon",
)


def history_scale(history: FloatArray) -> float:
    """Mean of the history, or 1.0 when the series never sold."""
    mean = float(history.mean()) if history.size else 0.0
    return mean if mean > 0 else 1.0


def features_at(history: FloatArray, position: int, scale: float) -> FloatArray:
    """Features known at ``position`` (inclusive), without the horizon column."""
    seen = history[: position + 1]
    lags = [seen[-k] / scale for k in LAGS]
    means = [seen[-w:].mean() / scale for w in WINDOWS]
    recent = seen[-OCCURRENCE_WINDOW:]
    occurrence = float((recent > 0).mean())
    sold = np.flatnonzero(seen > 0)
    since = float(seen.size - 1 - sold[-1]) if sold.size else float(seen.size)
    mean_size = float(seen[sold].mean()) / scale if sold.size else 0.0
    return np.array([*lags, *means, occurrence, since, mean_size], dtype=np.float64)


@dataclass(frozen=True)
class Design:
    """Training matrix, scaled target and the matching prediction rows."""

    x_train: FloatArray
    y_train: FloatArray
    x_predict: FloatArray
    scale: float


def build_design(history: FloatArray, horizon: int) -> Design:
    """Direct multi-horizon design for one history; empty training set if it is too short."""
    scale = history_scale(history)
    last = history.size - 1
    rows: list[FloatArray] = []
    targets: list[float] = []
    for position in range(MIN_CONTEXT - 1, last):
        base = features_at(history, position, scale)
        for step in range(1, horizon + 1):
            if position + step > last:
                break
            rows.append(np.append(base, step))
            targets.append(float(history[position + step]) / scale)
    width = len(FEATURE_NAMES)
    x_train = np.array(rows, dtype=np.float64).reshape(-1, width)
    if history.size >= MIN_CONTEXT:
        current = features_at(history, last, scale)
        x_predict = np.array([np.append(current, step) for step in range(1, horizon + 1)])
    else:
        x_predict = np.empty((0, width), dtype=np.float64)
    return Design(x_train, np.array(targets, dtype=np.float64), x_predict, scale)


def stack_designs(
    designs: list[Design], with_series_code: bool
) -> tuple[FloatArray, FloatArray, npt.NDArray[np.int64]]:
    """Pool training rows of several series, optionally adding the series code as last column."""
    blocks, targets, owners = [], [], []
    for code, design in enumerate(designs):
        x = design.x_train
        if with_series_code:
            x = np.column_stack([x, np.full(x.shape[0], code, dtype=np.float64)])
        blocks.append(x)
        targets.append(design.y_train)
        owners.append(np.full(x.shape[0], code, dtype=np.int64))
    width = len(FEATURE_NAMES) + int(with_series_code)
    if not blocks:
        return np.empty((0, width)), np.empty(0), np.empty(0, dtype=np.int64)
    return np.vstack(blocks), np.concatenate(targets), np.concatenate(owners)
