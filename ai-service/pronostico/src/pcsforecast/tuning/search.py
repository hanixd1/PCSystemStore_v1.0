"""Candidate configurations within a declared budget, and their score on internal origins."""

from __future__ import annotations

import itertools
from collections.abc import Collection, Mapping

import numpy as np
import pandas as pd

from pcsforecast.config import TunedModel
from pcsforecast.evaluation.metrics import summarise


def candidates(
    declared: Mapping[str, float], model: TunedModel, seed: int
) -> list[dict[str, float]]:
    """The declared configuration first, then grid points up to the budget.

    Grid points are the full product of the grid values over the declared configuration; when
    there are more than the budget allows, a seeded sample is kept in grid order.
    """
    base = dict(declared)
    names = list(model.grid)
    points = [
        {**base, **dict(zip(names, values, strict=True))}
        for values in itertools.product(*(model.grid[name] for name in names))
    ]
    points = [point for point in points if point != base]
    room = model.budget - 1
    if len(points) > room:
        chosen = np.random.default_rng(seed).choice(len(points), size=room, replace=False)
        points = [points[i] for i in sorted(int(i) for i in chosen)]
    return [base, *points]


def score(predictions: pd.DataFrame, series_ids: Collection[str]) -> tuple[float, int]:
    """Mean MASE over the (series, horizon) pairs of ``series_ids`` and how many were defined.

    Undefined MASE (zero naive scale) is left out, as in every summary; no defined value at all
    scores infinity.
    """
    if predictions.empty:
        return float("inf"), 0
    metrics = summarise(predictions)
    values = metrics.loc[metrics["series_id"].isin(series_ids), "mase"].dropna()
    if values.empty:
        return float("inf"), 0
    return float(values.mean()), int(values.size)
