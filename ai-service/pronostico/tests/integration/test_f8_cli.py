"""F8 commands end to end: freeze check and run comparison."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest
from typer.testing import CliRunner

from pcsforecast.cli import app

pytestmark = pytest.mark.integration
runner = CliRunner()


def test_freeze_check_and_refusal(configs_copy: Path) -> None:
    root = str(configs_copy)
    check = runner.invoke(app, ["freeze", "--check", "--root", root])
    assert check.exit_code == 0
    assert "TODO  data_manifests" in check.output
    no_commit = runner.invoke(app, ["freeze", "--root", root])
    assert no_commit.exit_code == 1
    refused = runner.invoke(app, ["freeze", "--commit", "abc", "--root", root])
    assert refused.exit_code == 1
    assert "ERROR" in refused.output


def test_compare_runs_command(tmp_path: Path) -> None:
    frame = pd.DataFrame(
        {"series_id": ["s"], "model": ["m"], "origin": [1], "horizon": [1], "y_hat": [1.0]}
    )
    for name in ("a", "b"):
        (tmp_path / name).mkdir()
        frame.to_parquet(tmp_path / name / "predictions.parquet")
    same = runner.invoke(app, ["compare-runs", str(tmp_path / "a"), str(tmp_path / "b")])
    assert same.exit_code == 0
    assert "identical=1" in same.output
    missing = runner.invoke(app, ["compare-runs", str(tmp_path / "a"), str(tmp_path / "c")])
    assert missing.exit_code == 1
