from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from pcsforecast import __version__
from pcsforecast.cli import app
from pcsforecast.config import CONFIG_FILES

pytestmark = pytest.mark.integration

runner = CliRunner()


def test_version() -> None:
    result = runner.invoke(app, ["version"])
    assert result.exit_code == 0
    assert result.stdout.strip() == __version__


def test_env_prints_json_fingerprint() -> None:
    result = runner.invoke(app, ["env"])
    assert result.exit_code == 0
    assert json.loads(result.stdout)["python"].startswith("3.")


def test_check_config_passes_on_project_configs(configs_copy: Path) -> None:
    result = runner.invoke(app, ["check-config", "--root", str(configs_copy)])
    assert result.exit_code == 0, result.output
    assert result.stdout.count("OK ") == len(CONFIG_FILES)


def test_check_config_fails_on_invalid_file(configs_copy: Path) -> None:
    protocol = configs_copy / "configs" / "protocol.yaml"
    protocol.write_text(protocol.read_text(encoding="utf-8") + "unexpected: 1\n", encoding="utf-8")
    result = runner.invoke(app, ["check-config", "--root", str(configs_copy)])
    assert result.exit_code == 1
    assert "INVALID  protocol.yaml" in result.output


def test_check_config_fails_on_missing_file(configs_copy: Path) -> None:
    (configs_copy / "configs" / "models.yaml").unlink()
    result = runner.invoke(app, ["check-config", "--root", str(configs_copy)])
    assert result.exit_code == 1
    assert "MISSING  models.yaml" in result.output
