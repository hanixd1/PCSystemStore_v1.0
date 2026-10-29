"""Reproducibility of a run: compare the predictions of two runs of the same configuration.

Used for the reliability tests of the plan (2.5.2 B: repeatability and reproducibility) and for
compatibility between host and container (quality plan, section 1). Differences are measured,
never rounded away.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

KEYS = ["series_id", "model", "origin", "horizon"]


class CompareInputError(RuntimeError):
    """The two runs cannot be compared."""


def compare_predictions(first: Path, second: Path) -> pd.DataFrame:
    """Per model: matched forecasts, identical ones and the largest absolute difference."""
    frames = []
    for run in (first, second):
        path = run / "predictions.parquet"
        if not path.is_file():
            raise CompareInputError(f"no predictions in {run}")
        frames.append(pd.read_parquet(path, columns=[*KEYS, "y_hat"]))
    joined = frames[0].merge(frames[1], on=KEYS, how="outer", suffixes=("_a", "_b"), indicator=True)
    rows = []
    for model, group in joined.groupby("model", sort=True):
        both = group[group["_merge"] == "both"]
        difference = np.abs(both["y_hat_a"].to_numpy() - both["y_hat_b"].to_numpy())
        rows.append(
            {
                "model": str(model),
                "forecasts": int(both.shape[0]),
                "only_in_one_run": int((group["_merge"] != "both").sum()),
                "identical": int((difference == 0).sum()),
                "max_abs_difference": float(difference.max(initial=0.0)),
            }
        )
    return pd.DataFrame(rows)
