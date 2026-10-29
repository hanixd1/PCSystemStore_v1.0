"""Production service (F11): thesis summary and deployment bundle on a synthetic store."""

import json
from pathlib import Path

import pytest

from pcsforecast.paths import project_paths
from pcsforecast.service.bundle import build_bundle
from pcsforecast.service.data import SERVICE_SERIES_ENV, load_series
from pcsforecast.service.research import SNAPSHOT_FILE, research_summary
from pcsforecast.service.synthetic import write_synthetic_project


@pytest.fixture
def synthetic_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.delenv(SERVICE_SERIES_ENV, raising=False)
    write_synthetic_project(tmp_path)
    return tmp_path


def test_summary_uses_the_served_profile_snapshot_and_versioned_freeze(
    synthetic_root: Path,
) -> None:
    paths = project_paths(synthetic_root)
    summary = research_summary(paths, load_series(paths))
    assert not paths.series.exists()  # the frozen research panels are not needed
    assert summary["freeze"]["tag"] == "synthetic-freeze"
    assert summary["accuracy"]["runId"] == "synthetic"
    assert summary["inventory"]["rows"]
    assert {row["level"] for row in summary["patterns"]} == {"total", "category", "sku"}
    assert summary["data"]["months"] == 32


def test_summary_degrades_without_profile_snapshot_or_freeze(synthetic_root: Path) -> None:
    paths = project_paths(synthetic_root)
    store = load_series(paths)
    for name in ("profile.parquet", SNAPSHOT_FILE):
        (store.source / name).unlink()
    (synthetic_root / "docs" / "freeze" / "FREEZE.json").unlink()
    summary = research_summary(paths, store)
    assert summary["patterns"] == []
    assert summary["accuracy"] is None
    assert summary["inventory"] is None
    assert summary["freeze"] == {"tag": None, "frozenAt": None}


def test_bundle_copies_the_served_series_for_a_private_volume(
    synthetic_root: Path, tmp_path_factory: pytest.TempPathFactory, monkeypatch: pytest.MonkeyPatch
) -> None:
    target = tmp_path_factory.mktemp("bundle")
    written = build_bundle(target, project_paths(synthetic_root))
    assert (target / "sealed" / "panel_sealed.parquet") in written
    # No run records on this root: the snapshot is written, empty.
    assert json.loads((target / SNAPSHOT_FILE).read_text(encoding="utf-8")) == {
        "accuracy": None,
        "inventory": None,
    }
    monkeypatch.setenv(SERVICE_SERIES_ENV, str(target))
    assert load_series(project_paths(tmp_path_factory.mktemp("empty"))).source == target


def test_bundle_fails_without_the_required_series(tmp_path: Path) -> None:
    root = tmp_path / "root"
    series = write_synthetic_project(root)
    (series / "catalog_skus.parquet").unlink()
    with pytest.raises(FileNotFoundError):
        build_bundle(tmp_path / "bundle", project_paths(root))
