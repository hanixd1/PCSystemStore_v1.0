"""Scaled errors with the in-sample naive scale of each origin (plan 2.6.4).

For every series, origin and horizon the scale is the one-step naive error on that origin's
training window: mean absolute difference for MASE, mean squared difference for RMSSE. A zero
scale makes the scaled measure undefined (NaN) and it is reported as such, never replaced.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from pcsforecast.models.base import FloatArray


def naive_scales(history: FloatArray) -> tuple[float, float]:
    """In-sample one-step naive MAE and MSE; NaN when the history has a single value."""
    if history.size < 2:  # noqa: PLR2004 - one difference needs two values
        return float("nan"), float("nan")
    differences = np.diff(history)
    return float(np.mean(np.abs(differences))), float(np.mean(differences**2))


def _safe_ratio(numerator: pd.Series, denominator: pd.Series) -> pd.Series:
    ratio = numerator / denominator.where(denominator > 0)
    return ratio.astype(float)


def summarise(predictions: pd.DataFrame) -> pd.DataFrame:
    """Per series, model and horizon: MAE, RMSE, bias, MASE, RMSSE and RelMAE vs naive.

    ``predictions`` needs y_true, y_hat, scale_mae and scale_mse per (series, model, origin,
    horizon). MASE averages the absolute errors over origins and divides by the mean scale, and
    RMSSE does the same with squared errors, so origins are pooled as in M5.
    """
    frame = predictions.assign(
        error=predictions["y_hat"] - predictions["y_true"],
    )
    frame = frame.assign(abs_error=frame["error"].abs(), sq_error=frame["error"] ** 2)
    keys = ["series_id", "frequency", "model", "family", "horizon"]
    grouped = frame.groupby(keys, sort=True).agg(
        origins=("origin", "nunique"),
        mae=("abs_error", "mean"),
        mse=("sq_error", "mean"),
        bias=("error", "mean"),
        cumulative_bias=("error", "sum"),
        scale_mae=("scale_mae", "mean"),
        scale_mse=("scale_mse", "mean"),
    )
    grouped["rmse"] = np.sqrt(grouped["mse"])
    grouped["mase"] = _safe_ratio(grouped["mae"], grouped["scale_mae"])
    grouped["rmsse"] = np.sqrt(_safe_ratio(grouped["mse"], grouped["scale_mse"]))
    result = grouped.reset_index()
    naive_mae = result.loc[result["model"] == "naive", ["series_id", "horizon", "mae"]].rename(
        columns={"mae": "naive_mae"}
    )
    result = result.merge(naive_mae, on=["series_id", "horizon"], how="left")
    result["rel_mae"] = _safe_ratio(result["mae"], result["naive_mae"])
    return result.drop(columns=["mse", "scale_mae", "scale_mse", "naive_mae"])
