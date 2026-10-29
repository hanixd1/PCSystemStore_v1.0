from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
import yaml

from pcsforecast.config import CONFIG_FILES, file_sha256
from pcsforecast.evaluation.compare import CompareInputError, compare_predictions
from pcsforecast.freeze.run import (
    FreezeError,
    git_head,
    readiness,
    step_manifests,
    write_freeze,
)
from pcsforecast.paths import ProjectPaths
from pcsforecast.protocol.origins import SealedTestError, assert_unsealed
from pcsforecast.reporting.markdown import markdown_table


def test_markdown_table() -> None:
    frame = pd.DataFrame({"a": ["x|y"], "b": [0.12345], "c": [True]})
    assert markdown_table(frame) == "| a | b | c |\n|---|---|---|\n| x\\|y | 0.123 | yes |"
    assert "1.5e-151" in markdown_table(pd.DataFrame({"p": [1.5e-151]}))


def test_compare_predictions(tmp_path: Path) -> None:
    base = pd.DataFrame(
        {
            "series_id": ["s", "s", "t"],
            "model": ["m", "m", "m"],
            "origin": [1, 2, 1],
            "horizon": [1, 1, 1],
            "y_hat": [1.0, 2.0, 3.0],
        }
    )
    for name, frame in (("a", base), ("b", base.iloc[:2].assign(y_hat=[1.0, 2.5]))):
        (tmp_path / name).mkdir()
        frame.to_parquet(tmp_path / name / "predictions.parquet")
    row = compare_predictions(tmp_path / "a", tmp_path / "b").iloc[0]
    assert (row["forecasts"], row["identical"], row["only_in_one_run"]) == (2, 1, 1)
    assert row["max_abs_difference"] == 0.5
    with pytest.raises(CompareInputError):
        compare_predictions(tmp_path / "a", tmp_path / "missing")


def test_seal_checks_configuration_hashes(tmp_path: Path) -> None:
    configs = tmp_path / "configs"
    configs.mkdir()
    (configs / "a.yaml").write_text("status: frozen\n", encoding="utf-8")
    record = {"status": "frozen", "configs": {"a.yaml": file_sha256(configs / "a.yaml")}}
    (tmp_path / "FREEZE.json").write_text(json.dumps(record), encoding="utf-8")
    assert assert_unsealed(tmp_path, configs)["status"] == "frozen"
    (configs / "a.yaml").write_text("status: frozen\nchanged: 1\n", encoding="utf-8")
    with pytest.raises(SealedTestError, match=r"changed after the freeze: a\.yaml"):
        assert_unsealed(tmp_path, configs)
    (tmp_path / "FREEZE.json").write_text(json.dumps({"status": "frozen"}), encoding="utf-8")
    with pytest.raises(SealedTestError, match="no configuration hashes"):
        assert_unsealed(tmp_path, configs)


def test_git_head_reads_loose_packed_and_detached_refs(tmp_path: Path) -> None:
    assert git_head(tmp_path) is None
    git = tmp_path / ".git"
    (git / "refs" / "heads").mkdir(parents=True)
    (git / "HEAD").write_text("ref: refs/heads/main\n", encoding="utf-8")
    assert git_head(tmp_path) is None
    (git / "packed-refs").write_text("# pack\nabc123 refs/heads/main\n", encoding="utf-8")
    assert git_head(tmp_path) == "abc123"
    (git / "refs" / "heads" / "main").write_text("def456\n", encoding="utf-8")
    assert git_head(tmp_path) == "def456"
    (git / "HEAD").write_text("0123abcd\n", encoding="utf-8")
    assert git_head(tmp_path) == "0123abcd"


def frozen_project(root: Path, project_root: Path) -> ProjectPaths:
    """A project whose configs are the repository's with ``status: frozen``."""
    paths = ProjectPaths(root)
    paths.configs.mkdir(parents=True)
    for name in CONFIG_FILES:
        text = (project_root / "configs" / name).read_text(encoding="utf-8")
        (paths.configs / name).write_text(
            text.replace("status: draft", "status: frozen"), encoding="utf-8"
        )
    (root / "uv.lock").write_text("lock\n", encoding="utf-8")
    sealed = paths.series / "sealed" / "panel_sealed.parquet"
    sealed.parent.mkdir(parents=True)
    sealed.write_bytes(b"sealed")
    outputs = {"data/03_series/sealed/panel_sealed.parquet": file_sha256(sealed)}
    manifest = {"outputs": outputs, "details": {"windows": {"test_start": "2026-03-01"}}}
    (paths.series / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    models = yaml.safe_load((paths.configs / "models.yaml").read_text(encoding="utf-8"))
    for spec in models["families"]["pretrained"]:
        folder = "models--" + spec["hf_repo"].replace("/", "--")
        snapshot = paths.models_cache / "hub" / folder / "snapshots" / spec["hf_revision"]
        snapshot.mkdir(parents=True, exist_ok=True)
        (snapshot / "config.json").write_text("{}", encoding="utf-8")
    run = root / "outputs" / "runs" / "r1-weekly-validation"
    run.mkdir(parents=True)
    run_record = {"mode": "internal_validation", "frequency": "weekly", "test_span_used": False}
    (run / "run.json").write_text(json.dumps(run_record), encoding="utf-8")
    git = root / ".git"
    (git / "refs" / "heads").mkdir(parents=True)
    (git / "HEAD").write_text("ref: refs/heads/main\n", encoding="utf-8")
    (git / "refs" / "heads" / "main").write_text("c0ffee\n", encoding="utf-8")
    return paths


def audit_reports(paths: ProjectPaths, reconciled: int) -> None:
    """Retail and vecinos audit reports as written by pcs audit-receipts and pcs audit."""
    retail = {
        "completeness": {"valid_receipts": 10},
        "consistency": {
            "receipts_reconciled_within_tolerance": reconciled,
            "max_abs_reconciliation_gap": 0.005,
        },
    }
    vecinos = {"consistency": {"reconciliation": {"match": 9, "mismatch": 1}}}
    (paths.clean / "retail").mkdir(parents=True, exist_ok=True)
    (paths.clean / "retail" / "audit_report.json").write_text(json.dumps(retail), "utf-8")
    (paths.clean / "audit_report.json").write_text(json.dumps(vecinos), "utf-8")


def test_freeze_needs_every_condition_then_writes_the_record(
    tmp_path: Path, project_root: Path
) -> None:
    paths = frozen_project(tmp_path, project_root)
    assert step_manifests(paths) == [paths.series]
    blocking = {c.name: c.detail for c in readiness(paths, "c0ffee") if not c.passed}
    assert "audit reports missing" in blocking["reconciliation"]
    with pytest.raises(FreezeError, match="reconciliation"):
        write_freeze(paths, "c0ffee", "v-test")

    audit_reports(paths, reconciled=9)  # one fiscal receipt does not reproduce its total
    failing = {c.name: c.detail for c in readiness(paths) if not c.passed}
    assert failing == {"reconciliation": failing["reconciliation"]}
    assert "receipts 9/10" in failing["reconciliation"]
    audit_reports(paths, reconciled=10)  # vecinos exceptions are reported, not blocking

    assert {c.name for c in readiness(paths, "beef") if not c.passed} == {"commit"}
    out = write_freeze(paths, "c0ffee", "v-test")
    record = json.loads(out.read_text(encoding="utf-8"))
    assert record["status"] == "frozen"
    assert record["commit"] == "c0ffee"
    assert set(record["configs"]) == set(CONFIG_FILES)
    assert record["reconciliation"]["receipts_reconciled"] == 10
    assert record["reconciliation"]["vecinos_blocks"] == {"match": 9, "mismatch": 1}
    assert record["final_test"]["start"] == "2026-03-01"
    assert record["development_runs"] == {"internal_validation-weekly": "r1-weekly-validation"}
    assert (tmp_path / "docs" / "freeze" / "FREEZE.json").read_text() == out.read_text()
    assert assert_unsealed(paths.manifests, paths.configs)["tag"] == "v-test"
    with pytest.raises(FreezeError, match="already exists"):
        write_freeze(paths, "c0ffee", "v-test")


def test_freeze_reports_draft_configs_changed_data_and_test_use(
    tmp_path: Path, project_root: Path
) -> None:
    paths = frozen_project(tmp_path, project_root)
    (paths.configs / "stats.yaml").write_text(
        (paths.configs / "stats.yaml").read_text().replace("status: frozen", "status: draft"),
        encoding="utf-8",
    )
    (paths.series / "sealed" / "panel_sealed.parquet").write_bytes(b"changed")
    cache = paths.models_cache / "hub"
    for snapshot in cache.rglob("config.json"):
        snapshot.unlink()
    run = tmp_path / "outputs" / "runs" / "r2-weekly-test"
    run.mkdir(parents=True)
    (run / "run.json").write_text(json.dumps({"test_span_used": True}), encoding="utf-8")
    (paths.configs / "series.yaml").write_text("status: frozen\n", encoding="utf-8")
    details = {c.name: c.detail for c in readiness(paths) if not c.passed}
    assert "stats.yaml" in details["configs_frozen"]
    assert "series.yaml" in details["configs_frozen"]
    assert "panel_sealed" in details["data_manifests"]
    assert "chronos_zero_shot" in details["pretrained_weights"]
    assert "r2-weekly-test" in details["test_span_unused"]
    assert np.isfinite(len(details))
