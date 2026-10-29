"""Reference forecasts with statsforecast for ``pcs compare-reference`` (ADR-0004).

Runs in an isolated environment (statsforecast does not install next to pandas 3, ADR-0006):

    uv run --isolated --no-project --python 3.14.9 \
        --with statsforecast==2.1.1 --with "pandas<3" \
        python -I scripts/reference/statsforecast_reference.py <directory>

Reads ``<directory>/cases.npz`` written by ``pcs reference-cases`` and writes
``<directory>/reference.npz`` with the one-step forecasts of Naive, SES, CrostonClassic,
CrostonSBA and TSB. It does not import the project's package.
"""

from __future__ import annotations

import sys
from importlib.metadata import version
from pathlib import Path

import numpy as np
from statsforecast.models import (
    TSB,
    CrostonClassic,
    CrostonSBA,
    Naive,
    SimpleExponentialSmoothing,
)


def main(directory: Path) -> None:
    with np.load(directory / "cases.npz") as data:
        histories = data["histories"]
        lengths = data["lengths"]
        ses_alpha = data["ses_alpha"]
        alpha_d = float(data["tsb_alpha_d"])
        alpha_p = float(data["tsb_alpha_p"])
    width = histories.shape[1]
    names = ("naive", "ses", "croston", "sba", "tsb")
    out = {name: np.empty(lengths.size) for name in names}
    for row, length in enumerate(lengths):
        y = histories[row, width - int(length) :].astype(np.float64)
        models = {
            "naive": Naive(),
            "ses": SimpleExponentialSmoothing(alpha=float(ses_alpha[row])),
            "croston": CrostonClassic(),
            "sba": CrostonSBA(),
            "tsb": TSB(alpha_d=alpha_d, alpha_p=alpha_p),
        }
        for name, model in models.items():
            out[name][row] = float(model.forecast(y=y, h=1)["mean"][0])
    versions = f"statsforecast {version('statsforecast')}, numpy {version('numpy')}"
    np.savez(directory / "reference.npz", versions=np.array(versions), **out)
    print(f"OK  {directory / 'reference.npz'}  ({lengths.size} cases, {versions})")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
