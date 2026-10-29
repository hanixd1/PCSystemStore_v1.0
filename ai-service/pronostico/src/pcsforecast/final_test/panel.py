"""The panel the final test is evaluated on, and its origins (plan Table 17, phase 4).

Every period keeps a split label: ``development`` before the test, ``test`` fully inside it and
``excluded`` for the periods that straddle a boundary. Origins and the inventory spans are read
from these labels, so the models see exactly what the rolling use of the forecast would give
them: all history up to the origin, test periods included once they are past.

The sealed panel is read only through ``load_evaluation`` with ``stage="test"``, which first
requires the freeze record and its configuration hashes (``assert_unsealed``) and the SHA-256 of
the sealed panel recorded at the freeze.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import date, timedelta

import pandas as pd

from pcsforecast.config import FrequencyProtocol, ProtocolConfig, file_sha256
from pcsforecast.manifest import read_manifest, verify_outputs
from pcsforecast.paths import ProjectPaths
from pcsforecast.protocol.origins import (
    Origin,
    SealedTestError,
    assert_unsealed,
    final_test_origins,
)
from pcsforecast.protocol.stages import Stage
from pcsforecast.protocol.windows import Windows, final_test_windows, split_label

DEVELOPMENT_PANEL = "panel_development.parquet"
SEALED_PANEL = ("sealed", "panel_sealed.parquet")


class FinalTestError(RuntimeError):
    """The final test cannot be evaluated with these inputs."""


@dataclass(frozen=True)
class Evaluation:
    """What a final-test (or rehearsal) run evaluates and how it is recorded."""

    stage: Stage
    panel: pd.DataFrame
    windows: Windows
    inputs: dict[str, str]
    freeze: dict[str, object] = field(default_factory=dict)

    @property
    def test_span_used(self) -> bool:
        return self.stage == "test"

    def frequency_panel(self, frequency: str) -> pd.DataFrame:
        return self.panel[self.panel["frequency"] == frequency]

    def labels(self, frequency: str) -> list[str]:
        """Split label of each period of the shared calendar of ``frequency``, in order."""
        calendar = self.frequency_panel(frequency).drop_duplicates("period_start")
        return calendar.sort_values("period_start")["split"].astype(str).tolist()

    def origins(self, frequency: str, protocol: FrequencyProtocol) -> list[Origin]:
        return final_test_origins(self.labels(frequency), protocol)

    def inventory_spans(
        self, frequency: str, protocol: FrequencyProtocol
    ) -> tuple[list[int], list[int]]:
        """Calibration and evaluation origins of the inventory simulation.

        The safety-stock multiplier is calibrated on every internal-validation origin of the
        development span and then applied, fixed, to the origins that serve the test periods
        (plan 2.6.5).
        """
        return inventory_spans(self.labels(frequency), protocol)

    def record(self) -> dict[str, object]:
        """Fields every run record of this evaluation carries."""
        details: dict[str, object] = {"stage": self.stage, "test_window": self.windows.as_dict()}
        if self.freeze:
            details["freeze"] = {
                key: self.freeze.get(key) for key in ("tag", "commit", "frozen_at")
            }
        return details


def evaluated_panel(
    paths: ProjectPaths, evaluation: Evaluation | None, error: type[Exception]
) -> tuple[pd.DataFrame, dict[str, str], Stage]:
    """Panel, input hashes and stage of a run: the evaluation's, or the development panel.

    The development panel is read only if the series still match their manifest; otherwise
    ``error`` is raised.
    """
    if evaluation is not None:
        return evaluation.panel, evaluation.inputs, evaluation.stage
    changed = verify_outputs(paths.series, paths.root)
    if changed:
        raise error(f"series files differ from the series manifest: {changed}")
    path = paths.series / DEVELOPMENT_PANEL
    return pd.read_parquet(path), {"panel_development": file_sha256(path)}, "development"


def inventory_spans(
    labels: Sequence[str], protocol: FrequencyProtocol
) -> tuple[list[int], list[int]]:
    development = [i for i, label in enumerate(labels) if label == "development"]
    test = [i for i, label in enumerate(labels) if label == "test"]
    if not development or not test:
        raise FinalTestError("the panel has no development or no test periods")
    calibration = list(range(protocol.min_train_periods - 1, development[-1]))
    evaluation = list(range(test[0] - 1, test[-1]))
    return calibration, evaluation


def rehearsal_windows(windows: Windows, test_months: int) -> Windows:
    """The last ``test_months`` complete months of the development span, as a stand-in test."""
    development_end = windows.test_start - timedelta(days=1)
    return final_test_windows(windows.record_start, development_end, test_months)


def _series_windows(paths: ProjectPaths) -> Windows:
    details = read_manifest(paths.series).get("details", {})
    recorded = details.get("windows", {}) if isinstance(details, dict) else {}
    try:
        return Windows(**{k: date.fromisoformat(v) for k, v in recorded.items()})
    except (TypeError, ValueError) as error:
        raise FinalTestError("the series manifest records no windows") from error


def label(panel: pd.DataFrame, windows: Windows) -> pd.DataFrame:
    """Periods up to the end of the test window, relabelled against ``windows``."""
    kept = panel[panel["period_end"] <= pd.Timestamp(windows.test_end)].copy()
    kept["split"] = split_label(kept["period_start"], kept["period_end"], windows)
    return kept.sort_values(["series_id", "period_start"]).reset_index(drop=True)


def load_evaluation(paths: ProjectPaths, protocol: ProtocolConfig, stage: Stage) -> Evaluation:
    """Panel, windows and input hashes of the final test (``test``) or its rehearsal."""
    changed = verify_outputs(paths.series, paths.root)
    if changed:
        raise FinalTestError(f"series files differ from the series manifest: {changed}")
    windows = _series_windows(paths)
    development_path = paths.series / DEVELOPMENT_PANEL
    development = pd.read_parquet(development_path)
    inputs = {"panel_development": file_sha256(development_path)}
    if stage == "rehearsal":
        stand_in = rehearsal_windows(windows, protocol.final_test.last_complete_months)
        return Evaluation(stage, label(development, stand_in), stand_in, inputs)
    if stage != "test":
        raise FinalTestError(f"unknown final-test stage {stage!r}")
    try:
        freeze = assert_unsealed(paths.manifests, paths.configs)
    except SealedTestError as error:
        raise FinalTestError(str(error)) from error
    sealed_path = paths.series.joinpath(*SEALED_PANEL)
    digest = file_sha256(sealed_path)
    if digest != freeze.get("sealed_test_panel"):
        raise FinalTestError("the sealed test panel differs from the one recorded at the freeze")
    inputs["panel_sealed"] = digest
    panel = pd.concat([development, pd.read_parquet(sealed_path)], ignore_index=True)
    return Evaluation(stage, label(panel, windows), windows, inputs, freeze)
