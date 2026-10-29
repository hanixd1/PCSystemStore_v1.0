"""Cross-check of the own statistical models against statsforecast (ADR-0004, plan Table 23).

The own NumPy recursions are compared with the reference implementations on real training
windows of the development panel. statsforecast does not install next to pandas 3 (ADR-0006), so
the comparison runs in three steps and the reference runs in an isolated environment:

1. ``pcs reference-cases`` writes ``cases.npz``: training windows (every selected series at a
   seeded sample of validation origins) and the parameters of each model.
2. ``scripts/reference/statsforecast_reference.py`` reads it in the isolated environment and
   writes ``reference.npz`` (``scripts/cross_check_statsforecast.sh`` runs the three steps).
3. ``pcs compare-reference`` computes the own forecasts of the same cases and compares.

What is compared is the recursion of each method at the same parameters: Croston and SBA at
statsforecast's fixed alpha = 0.1, SES and TSB at the configured or selected parameters, and TSB
with both initialisations (the declared one differs from statsforecast's by design).
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import numpy.typing as npt
import pandas as pd

from pcsforecast import __version__
from pcsforecast.config import FrequencyName, ProtocolConfig, file_sha256
from pcsforecast.manifest import verify_outputs
from pcsforecast.models.base import FloatArray, Forecaster
from pcsforecast.models.statistical import SES, TSB, Croston, Naive, sba, ses_level
from pcsforecast.paths import ProjectPaths
from pcsforecast.protocol.origins import TrainView, validation_origins
from pcsforecast.runner.engine import panel_series
from pcsforecast.runner.paths import common_length
from pcsforecast.runtime import environment_fingerprint

CASES_FILE = "cases.npz"
REFERENCE_FILE = "reference.npz"
RECORD_FILE = "crosscheck.json"
REFERENCE_ALPHA = 0.1  # statsforecast's CrostonClassic and CrostonSBA fix alpha at 0.1
TOLERANCE = 1e-9
# Methods whose own and reference forecasts must agree; tsb_declared differs by initialisation.
MUST_MATCH = ("naive", "ses", "croston", "sba", "tsb")
IntArray = npt.NDArray[np.int64]


class ReferenceInputError(RuntimeError):
    """Cases or reference forecasts are missing or inconsistent."""


@dataclass(frozen=True)
class Cases:
    """Training windows, left-padded with NaN, and the parameters used for every case."""

    histories: FloatArray
    lengths: IntArray
    ses_alpha: FloatArray
    tsb_alpha_d: float
    tsb_alpha_p: float

    def history(self, row: int) -> FloatArray:
        width = self.histories.shape[1]
        return self.histories[row, width - int(self.lengths[row]) :]

    def __len__(self) -> int:
        return int(self.lengths.size)


def selected_alpha(history: FloatArray) -> float:
    """The alpha the own SES selects for this history (in-sample one-step squared error)."""
    grid = SES().alpha_grid
    return min(grid, key=lambda a: (ses_level(history, a)[1], a))


def build_cases(windows: list[FloatArray], tsb_params: Mapping[str, float]) -> Cases:
    width = max(window.size for window in windows)
    histories = np.full((len(windows), width), np.nan)
    for row, window in enumerate(windows):
        histories[row, width - window.size :] = window
    return Cases(
        histories=histories,
        lengths=np.array([w.size for w in windows], dtype=np.int64),
        ses_alpha=np.array([selected_alpha(w) for w in windows]),
        tsb_alpha_d=float(tsb_params.get("alpha_d", 0.1)),
        tsb_alpha_p=float(tsb_params.get("alpha_p", 0.1)),
    )


def own_forecasts(cases: Cases) -> dict[str, FloatArray]:
    """One-step forecasts of the own implementations for every case."""
    tsb = TSB(alpha_d=cases.tsb_alpha_d, alpha_p=cases.tsb_alpha_p, probability_init="first")
    declared = TSB(alpha_d=cases.tsb_alpha_d, alpha_p=cases.tsb_alpha_p)
    models: dict[str, Forecaster] = {
        "naive": Naive(),
        "croston": Croston(alpha=REFERENCE_ALPHA),
        "sba": sba(alpha=REFERENCE_ALPHA),
        "tsb": tsb,
        "tsb_declared": declared,
    }
    out = {name: np.empty(len(cases)) for name in [*models, "ses"]}
    for row in range(len(cases)):
        history = cases.history(row)
        for name, model in models.items():
            out[name][row] = model.forecast(history, 1)[0]
        out["ses"][row] = max(ses_level(history, float(cases.ses_alpha[row]))[0], 0.0)
    return out


def compare(own: Mapping[str, FloatArray], reference: Mapping[str, FloatArray]) -> pd.DataFrame:
    """Per method: cases, maximum absolute and relative difference, and agreement."""
    rows = []
    for name, values in own.items():
        target = reference["tsb" if name == "tsb_declared" else name]
        if target.shape != values.shape:
            raise ReferenceInputError(f"{name}: {values.shape} own vs {target.shape} reference")
        difference = np.abs(values - target)
        relative = difference / np.maximum(np.abs(target), 1.0)
        rows.append(
            {
                "method": name,
                "cases": int(values.size),
                "max_abs_difference": float(difference.max(initial=0.0)),
                "max_rel_difference": float(relative.max(initial=0.0)),
                "cases_within_tolerance": int((relative <= TOLERANCE).sum()),
                "must_match": name in MUST_MATCH,
            }
        )
    table = pd.DataFrame(rows)
    table["agrees"] = table["cases_within_tolerance"] == table["cases"]
    return table


def _sample_windows(
    paths: ProjectPaths, frequency: FrequencyName, protocol: ProtocolConfig, origins: int, seed: int
) -> list[FloatArray]:
    panel = pd.read_parquet(paths.series / "panel_development.parquet")
    profile = pd.read_parquet(paths.series / "profile.parquet")
    selected = profile[(profile["frequency"] == frequency) & profile["selected"]]
    series, _ = panel_series(panel[panel["frequency"] == frequency], selected["series_id"].tolist())
    frequency_protocol = protocol.frequencies[frequency]
    positions = [o.position for o in validation_origins(common_length(series), frequency_protocol)]
    count = min(origins, len(positions))
    chosen = sorted(np.random.default_rng(seed).choice(positions, size=count, replace=False))
    window = frequency_protocol.window
    return [
        TrainView.at(values, int(origin), window.primary, window.length).history
        for values in series.values()
        for origin in chosen
    ]


def run_reference_cases(
    paths: ProjectPaths,
    frequency: FrequencyName,
    protocol: ProtocolConfig,
    tsb_params: Mapping[str, float],
    *,
    origins: int = 10,
    seed: int = 20261024,
) -> Path:
    """Step 1: write the cases of one frequency to a new ``outputs/reference`` directory."""
    changed = verify_outputs(paths.series, paths.root)
    if changed:
        raise ReferenceInputError(f"series files differ from the series manifest: {changed}")
    cases = build_cases(_sample_windows(paths, frequency, protocol, origins, seed), tsb_params)
    started = datetime.now(UTC)
    out = paths.root / "outputs" / "reference" / f"{started:%Y%m%dT%H%M%SZ}-{frequency}"
    out.mkdir(parents=True, exist_ok=False)
    np.savez(
        out / CASES_FILE,
        histories=cases.histories,
        lengths=cases.lengths,
        ses_alpha=cases.ses_alpha,
        tsb_alpha_d=cases.tsb_alpha_d,
        tsb_alpha_p=cases.tsb_alpha_p,
    )
    record = {
        "frequency": frequency,
        "cases": len(cases),
        "origins_sampled": origins,
        "seed": seed,
        "created_at": started.isoformat(timespec="seconds"),
        "inputs": {
            "panel_development": file_sha256(paths.series / "panel_development.parquet"),
        },
        "test_span_used": False,
    }
    (out / RECORD_FILE).write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    return out


def load_cases(directory: Path) -> Cases:
    with np.load(directory / CASES_FILE) as data:
        return Cases(
            histories=data["histories"],
            lengths=data["lengths"],
            ses_alpha=data["ses_alpha"],
            tsb_alpha_d=float(data["tsb_alpha_d"]),
            tsb_alpha_p=float(data["tsb_alpha_p"]),
        )


def run_compare_reference(directory: Path) -> pd.DataFrame:
    """Step 3: compare the own forecasts with ``reference.npz`` and complete the record."""
    if not (directory / REFERENCE_FILE).is_file():
        raise ReferenceInputError(f"no {REFERENCE_FILE} in {directory}: run the reference first")
    cases = load_cases(directory)
    with np.load(directory / REFERENCE_FILE, allow_pickle=False) as data:
        reference = {name: data[name] for name in data.files if name != "versions"}
        versions = str(data["versions"]) if "versions" in data.files else ""
    table = compare(own_forecasts(cases), reference)
    table.to_csv(directory / "comparison.csv", index=False)
    record = json.loads((directory / RECORD_FILE).read_text(encoding="utf-8"))
    record.update(
        {
            "reference": versions,
            "tolerance": TOLERANCE,
            "methods_that_must_match": list(MUST_MATCH),
            "all_agree": bool(table.loc[table["must_match"], "agrees"].all()),
            "package_version": __version__,
            "compared_at": datetime.now(UTC).isoformat(timespec="seconds"),
            "inputs_compared": {
                CASES_FILE: file_sha256(directory / CASES_FILE),
                REFERENCE_FILE: file_sha256(directory / REFERENCE_FILE),
            },
            "environment": environment_fingerprint(),
        }
    )
    (directory / RECORD_FILE).write_text(
        json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return table
