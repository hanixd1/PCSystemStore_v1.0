from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from pcsforecast.config import duplicates
from pcsforecast.evaluation.metrics import naive_scales
from pcsforecast.inventory.simulator import protection_sigma
from pcsforecast.manifest import StepManifest, read_manifest, verify_outputs


def test_duplicates_are_sorted_and_unique() -> None:
    assert duplicates(["b", "a", "b", "c", "a", "b"]) == ["a", "b"]
    assert duplicates([]) == []


def test_write_parquet_creates_folders_and_records_the_output(tmp_path: Path) -> None:
    manifest = StepManifest(step="demo", root=tmp_path)
    target = tmp_path / "out" / "nested" / "frame.parquet"
    manifest.write_parquet(pd.DataFrame({"a": [1, 2]}), target)
    manifest.write(tmp_path / "out")
    assert pd.read_parquet(target)["a"].tolist() == [1, 2]
    outputs = read_manifest(tmp_path / "out")["outputs"]
    assert isinstance(outputs, dict)
    assert list(outputs) == ["out/nested/frame.parquet"]
    assert verify_outputs(tmp_path / "out", tmp_path) == []


def test_protection_sigma_is_the_naive_rmse_scaled() -> None:
    history = np.array([1.0, 4.0, 2.0, 2.0])
    _, mse = naive_scales(history)
    assert protection_sigma(history, 2) == np.sqrt(mse) * np.sqrt(2)
