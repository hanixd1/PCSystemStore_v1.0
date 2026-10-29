"""End-to-end F1 run on a small synthetic workbook that mimics the vecinos file's quirks."""

from __future__ import annotations

import json
import os
import stat
from datetime import datetime
from pathlib import Path

import openpyxl
import pandas as pd
import pytest
from typer.testing import CliRunner

from pcsforecast.cli import app

pytestmark = pytest.mark.integration

runner = CliRunner()
HEADER: list[object] = ["CANT", "PRODUCTO", "MONTO", "PASE", "SERIE", "OBS"]
WORKBOOK = "VENTAS_INTERNAS_TEST.xlsx"


def _write_workbook(path: Path) -> None:
    workbook = openpyxl.Workbook()
    workbook.remove(workbook.active)
    sheets: dict[str, list[list[object]]] = {
        "03-01-24": [
            HEADER,
            [1, "SSD WD 1TB", 215, "Alfa", "SN1", "PAGO"],
            [2, "RAM 8GB", 150, "BETA", None, "PAGO"],
            [1, "MOUSE", 30, "BETA", None, None],
            [1, None, None, None, None, None],
            [None, "TOTAL", 395],
        ],
        "04-01": [
            HEADER,
            [None, "CPU R5", 390, "alfa", "SN2", "PG"],
            [1, "PSU 500W", None, "GAMMA", None, "DEV"],
            [None, "TOTAL", 390],
        ],
        "05-01-24": [
            HEADER,
            [1, "SSD WD 1TB", 215, "DELTA", "SN3", "T"],
            [1, "RAM 16GB", 140, "BETA", None, datetime(2024, 1, 9)],
            [None, "TOTAL", 200],
        ],
        "05-01-24 (2)": [
            HEADER,
            [1, "FAN", 20, "DELTA", None, "PAGO", "COMPRA SSD", 300, None, datetime(2024, 1, 9)],
            [None, "TOTAL", 20],
        ],
        "Hoja1": [],
    }
    for name, rows in sheets.items():
        worksheet = workbook.create_sheet(name)
        for row in rows:
            worksheet.append(row)
    workbook["Hoja1"].sheet_state = "hidden"
    workbook.save(path)


@pytest.fixture
def project(configs_copy: Path) -> Path:
    delivery = configs_copy / "datos"
    delivery.mkdir()
    _write_workbook(delivery / WORKBOOK)
    return configs_copy


def _invoke(*args: str) -> str:
    result = runner.invoke(app, list(args))
    assert result.exit_code == 0, result.output
    return result.output


def test_full_f1_run(project: Path) -> None:
    root = str(project)
    _invoke("register-raw", "--root", root)
    raw = project / "data" / "00_raw" / "vecinos_daily_sheets" / WORKBOOK
    assert not raw.stat().st_mode & (stat.S_IWUSR | stat.S_IWGRP | stat.S_IWOTH)

    _invoke("stage", "--root", root)
    _invoke("audit", "--root", root)

    clean = project / "data" / "02_clean"
    lines = pd.read_parquet(clean / "vecinos_lines.parquet")
    valid = lines[lines["status"] == "valid"].set_index("product_text")
    assert sorted(valid.index) == [
        "CPU R5",
        "FAN",
        "MOUSE",
        "PSU 500W",
        "RAM 8GB",
        "SSD WD 1TB",
        "SSD WD 1TB",
    ]
    assert valid.loc["CPU R5", "quantity_imputed"]
    assert valid.loc["CPU R5", "date_start"] == pd.Timestamp("2024-01-04")
    assert valid.loc["CPU R5", "date_confidence"] == "medium"
    assert valid.loc["FAN", "date_start"] == pd.Timestamp("2024-01-06")
    assert valid.loc["FAN", "date_confidence"] == "medium"
    assert valid.loc["PSU 500W", "movement_type"] == "return"
    assert valid.loc["MOUSE", "movement_type"] == "not_sold"

    report = json.loads((clean / "audit_report.json").read_text(encoding="utf-8"))
    assert report["completeness"]["valid_lines"] == 7
    assert report["completeness"]["excluded_by_rule"] == {"R201": 1, "R209": 1}
    assert report["consistency"]["reconciliation"] == {"match": 3, "mismatch": 1}
    assert report["currentness"]["sheet_date_confidence"] == {
        "high": 2,
        "medium": 2,
        "none": 1,
    }
    assert report["credibility"]["unmapped_codes"] == {}
    assert report["credibility"]["valid_lines_by_movement"] == {
        "not_sold": 1,
        "return": 1,
        "sale_paid": 5,
    }

    staged = pd.read_parquet(project / "data" / "01_staged" / "vecinos_lines.parquet")
    assert "pase_raw" not in staged.columns
    assert staged["customer_code"].notna().any()
    private = pd.read_parquet(project / "data" / "private" / "customer_codes.parquet")
    assert "ALFA" in set(private["customer_name"])
    for path in clean.glob("*"):
        assert "ALFA" not in path.read_bytes().decode("latin-1").upper()


def test_customer_case_variants_share_a_code(project: Path) -> None:
    root = str(project)
    for step in ("register-raw", "stage", "audit"):
        _invoke(step, "--root", root)
    lines = pd.read_parquet(project / "data" / "02_clean" / "vecinos_lines.parquet")
    codes = lines.set_index("product_text")["customer_code"]
    assert codes["CPU R5"] == codes.loc["SSD WD 1TB"].iloc[0]


def test_reregistering_is_idempotent_and_changes_are_refused(project: Path) -> None:
    root = str(project)
    _invoke("register-raw", "--root", root)
    _invoke("register-raw", "--root", root)
    delivered = project / "datos" / WORKBOOK
    delivered.write_bytes(delivered.read_bytes() + b"tampered")
    result = runner.invoke(app, ["register-raw", "--root", root])
    assert result.exit_code == 1
    assert "different content" in result.output


def test_no_delivered_files(configs_copy: Path) -> None:
    (configs_copy / "datos").mkdir()
    result = runner.invoke(app, ["register-raw", "--root", str(configs_copy)])
    assert result.exit_code == 1
    assert "No delivered files" in result.output


def test_audit_refuses_tampered_staged_files(project: Path) -> None:
    root = str(project)
    _invoke("register-raw", "--root", root)
    _invoke("stage", "--root", root)
    staged = project / "data" / "01_staged" / "vecinos_lines.parquet"
    staged.write_bytes(staged.read_bytes() + b"x")
    result = runner.invoke(app, ["audit", "--root", root])
    assert result.exit_code == 1
    assert "differ from the stage manifest" in result.output


def test_stage_refuses_tampered_raw_files(project: Path) -> None:
    root = str(project)
    _invoke("register-raw", "--root", root)
    raw = project / "data" / "00_raw" / "vecinos_daily_sheets" / WORKBOOK
    os.chmod(raw, stat.S_IRUSR | stat.S_IWUSR)  # noqa: PTH101 - simulate an edit
    raw.write_bytes(raw.read_bytes() + b"x")
    result = runner.invoke(app, ["stage", "--root", root])
    assert result.exit_code == 1
    assert "differ from their registration" in result.output


def test_check_privacy_finds_and_allowlists_names(project: Path) -> None:
    root = str(project)
    for step in ("register-raw", "stage", "audit"):
        _invoke(step, "--root", root)
    private = project / "data" / "private"
    assert stat.S_IMODE(private.stat().st_mode) == 0o700
    clean_check = runner.invoke(app, ["check-privacy", "--root", root])
    assert clean_check.exit_code == 0, clean_check.output
    assert "no customer name or DNI/RUC found" in clean_check.output

    leak = project / "docs" / "notes.md"
    leak.parent.mkdir()
    leak.write_text("Pedido de Alfa", encoding="utf-8")
    result = runner.invoke(app, ["check-privacy", "--root", root])
    assert result.exit_code == 1
    assert "docs/notes.md" in result.output
    assert "ALFA" not in result.output
    shown = runner.invoke(app, ["check-privacy", "--show-names", "--root", root])
    assert "ALFA" in shown.output

    (private / "privacy_allowlist.txt").write_text("ALFA\n", encoding="utf-8")
    allowed = runner.invoke(app, ["check-privacy", "--root", root])
    assert allowed.exit_code == 0, allowed.output
