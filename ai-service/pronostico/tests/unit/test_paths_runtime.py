from __future__ import annotations

from pathlib import Path

import pytest

from pcsforecast import __version__
from pcsforecast.paths import ROOT_ENV_VAR, project_paths
from pcsforecast.runtime import environment_fingerprint, package_versions


def test_explicit_root_wins(tmp_path: Path) -> None:
    paths = project_paths(tmp_path)
    assert paths.root == tmp_path.resolve()
    assert paths.raw == tmp_path.resolve() / "data" / "00_raw"
    assert paths.runs == tmp_path.resolve() / "outputs" / "runs"


def test_root_from_environment(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(ROOT_ENV_VAR, str(tmp_path))
    assert project_paths().root == tmp_path.resolve()


def test_root_defaults_to_cwd(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv(ROOT_ENV_VAR, raising=False)
    monkeypatch.chdir(tmp_path)
    assert project_paths().root == tmp_path.resolve()


def test_all_layout_directories_are_under_root(tmp_path: Path) -> None:
    paths = project_paths(tmp_path)
    layout = [
        paths.configs,
        paths.data,
        paths.raw,
        paths.staged,
        paths.clean,
        paths.series,
        paths.manifests,
        paths.private,
        paths.models_cache,
        paths.runs,
    ]
    assert len(set(layout)) == len(layout)
    assert all(path.is_relative_to(paths.root) for path in layout)


def test_package_versions_reports_missing_packages_as_none() -> None:
    versions = package_versions(("pcsforecast", "surely-not-an-installed-package"))
    assert versions == {"pcsforecast": __version__, "surely-not-an-installed-package": None}


def test_environment_fingerprint_has_required_fields() -> None:
    fingerprint = environment_fingerprint()
    assert str(fingerprint["python"]).startswith("3.")
    for key in ("system", "machine", "cpu_count", "in_container", "packages"):
        assert key in fingerprint
