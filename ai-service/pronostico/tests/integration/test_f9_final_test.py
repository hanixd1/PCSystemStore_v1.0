"""F9 end to end on the synthetic project: rehearsal, refusals, single opening, tables."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pytest
from typer.testing import CliRunner

from pcsforecast.cli import app
from pcsforecast.config import CONFIG_FILES, file_sha256

pytestmark = pytest.mark.integration
runner = CliRunner()
COMMIT = "0123456789abcdef0123456789abcdef01234567"


def _invoke(*args: str) -> str:
    result = runner.invoke(app, list(args))
    assert result.exit_code == 0, result.output
    return result.output


def _outputs(output: str) -> list[Path]:
    return [Path(line.split("OK  ")[1]) for line in output.splitlines() if line.startswith("OK  ")]


def _record(directory: Path) -> dict[str, object]:
    name = "run.json" if (directory / "run.json").is_file() else "stats.json"
    record: dict[str, object] = json.loads((directory / name).read_text(encoding="utf-8"))
    return record


def _freeze(project: Path, sealed_hash: str) -> None:
    configs = {
        name: file_sha256(project / "configs" / name)
        for name in CONFIG_FILES
        if (project / "configs" / name).is_file()
    }
    record = {
        "status": "frozen",
        "tag": "v-test",
        "commit": COMMIT,
        "configs": configs,
        "sealed_test_panel": sealed_hash,
    }
    (project / "data" / "04_manifests" / "FREEZE.json").write_text(json.dumps(record))


def _opening(project: Path) -> dict[str, object]:
    path = project / "data" / "04_manifests" / "TEST_OPENED.json"
    record: dict[str, object] = json.loads(path.read_text(encoding="utf-8"))
    return record


def _targets(directory: Path) -> pd.Series:
    return pd.read_parquet(directory / "predictions.parquet")["target_period"]


@pytest.fixture
def built(project: Path) -> Path:
    """The synthetic project with its series and internal-validation runs."""
    root = str(project)
    for step in ("register-raw", "stage", "audit", "build-series"):
        _invoke(step, "--root", root)
    for frequency in ("weekly", "monthly"):
        _invoke("run-validation", "--frequency", frequency, "--root", root)
    return project


def test_rehearsal_keeps_the_test_sealed(built: Path) -> None:
    project, root = built, str(built)
    # Rehearsal: the last two development months stand in for the test, which stays sealed.
    rehearsal = _outputs(_invoke("run-final-test", "--rehearsal", "--root", root))
    assert len(rehearsal) == 10  # 2 frequencies x (3 conditions + inventory + statistics)
    for directory in rehearsal:
        record = _record(directory)
        assert record["test_span_used"] is False
        assert record["stage"] == "rehearsal"
    first = rehearsal[0]
    assert _record(first)["mode"] == "final_test_rehearsal"
    assert _targets(first).between(pd.Timestamp("2024-08-01"), pd.Timestamp("2024-09-30")).all()
    assert not (project / "data" / "04_manifests" / "TEST_OPENED.json").exists()
    tables = _outputs(_invoke("article-tables", "--stage", "rehearsal", "--root", root))
    assert "rehearsal of the final test" in tables[0].read_text(encoding="utf-8")
    thesis = _outputs(_invoke("thesis-tables", "--stage", "rehearsal", "--root", root))
    assert "rehearsal of the final test" in thesis[0].read_text(encoding="utf-8")
    sealed = runner.invoke(app, ["thesis-tables", "--stage", "test", "--root", root])
    assert sealed.exit_code == 1  # the test stays sealed without a freeze record


def test_single_opening_after_refusals(built: Path) -> None:
    project, root = built, str(built)
    # Refusals: no commit, a commit that is not checked out, then no freeze record.
    assert runner.invoke(app, ["run-final-test", "--root", root]).exit_code == 1
    unknown = runner.invoke(app, ["run-final-test", "--commit", COMMIT, "--root", root])
    assert unknown.exit_code == 1
    assert "not the one checked out" in unknown.output
    (project / ".git").mkdir()
    (project / ".git" / "HEAD").write_text(COMMIT + "\n")
    sealed = runner.invoke(app, ["run-final-test", "--commit", COMMIT, "--root", root])
    assert sealed.exit_code == 1
    assert "sealed" in sealed.output
    _freeze(project, "0" * 64)
    tampered = runner.invoke(app, ["run-final-test", "--commit", COMMIT, "--root", root])
    assert "differs from the one recorded" in tampered.output
    assert _opening(project)["status"] == "interrupted"

    # The single opening.
    _freeze(
        project, file_sha256(project / "data" / "03_series" / "sealed" / "panel_sealed.parquet")
    )
    opened = _outputs(_invoke("run-final-test", "--commit", COMMIT, "--root", root))
    assert len(opened) == 10
    accuracy = opened[0]
    record = _record(accuracy)
    assert record["mode"] == "final_test"
    assert record["test_span_used"] is True
    assert record["freeze"] == {"tag": "v-test", "commit": COMMIT, "frozen_at": None}
    inputs = record["inputs"]
    assert isinstance(inputs, dict)
    assert "panel_sealed" in inputs
    assert _targets(accuracy).between(pd.Timestamp("2024-10-01"), pd.Timestamp("2024-11-30")).all()
    assert _targets(accuracy).max() >= pd.Timestamp("2024-11-01")
    inventory = next(d for d in opened if d.name.endswith("test-inventory"))
    simulation = pd.read_parquet(inventory / "simulation.parquet")
    assert (
        simulation["served"] + simulation["lost_units"] - simulation["demand"]
    ).abs().max() < 1e-9
    opening = _opening(project)
    attempts = opening["attempts"]
    assert opening["status"] == "completed"
    assert isinstance(attempts, list)
    assert [a["status"] for a in attempts] == ["failed", "failed", "completed"]

    again = runner.invoke(app, ["run-final-test", "--commit", COMMIT, "--root", root])
    assert again.exit_code == 1
    assert "already opened" in again.output
    tables = _outputs(_invoke("article-tables", "--stage", "test", "--root", root))
    text = tables[0].read_text(encoding="utf-8")
    assert "MASE by horizon, level and model (final test)" in text
    assert "test origins" in text
    thesis = _outputs(_invoke("thesis-tables", "--stage", "test", "--root", root))
    chapter = thesis[0].read_text(encoding="utf-8")
    for title in ("Table T1. Shapiro-Wilk", "Table T7. General hypothesis", "Table T15. HE3"):
        assert title in chapter
    assert "| test | weekly | total |" in chapter
    figures = _outputs(_invoke("thesis-figures", "--stage", "test", "--root", root))[0]
    for name in ("critical_difference.png", "service_vs_stock.png"):
        assert (figures / name).stat().st_size > 10_000
