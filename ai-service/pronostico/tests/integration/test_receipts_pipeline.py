"""End-to-end retail-receipt run on synthetic PDFs with fictitious customers."""

from __future__ import annotations

import json
import stat
from pathlib import Path

import pandas as pd
import pytest
from typer.testing import CliRunner

from conftest import boleta_pages, factura_pages, write_pdf
from pcsforecast.cli import app

pytestmark = pytest.mark.integration

runner = CliRunner()
PERSONAL = ("BETA COMERCIAL", "20123456789", "GAMMA DELTA", "12345678", "FICTICIA")


@pytest.fixture
def project(configs_copy: Path) -> Path:
    receipts = configs_copy / "datos" / "Boletas y Facturas" / "2026"
    write_pdf(receipts / "Mayo" / "Factura" / "f15.pdf", factura_pages(15, "04/05/2026"))
    write_pdf(receipts / "Mayo" / "Factura" / "f18.pdf", factura_pages(18, "29/05/2026"))
    # Filed under June and again under May: one receipt, logged twice (R301, R303).
    write_pdf(receipts / "Junio" / "Factura" / "f19.pdf", factura_pages(19, "31/05/2026"))
    write_pdf(receipts / "Mayo" / "Factura" / "f19-copia.pdf", factura_pages(19, "31/05/2026"))
    write_pdf(receipts / "Mayo" / "Factura" / "b7.pdf", boleta_pages(7))  # kind from title (R302)
    return configs_copy


def _invoke(*args: str) -> str:
    result = runner.invoke(app, list(args))
    assert result.exit_code == 0, result.output
    return result.output


def _shared_text(root: Path) -> str:
    """Every table and report a study output could contain, as one text."""
    texts = []
    for directory in (root / "data" / "01_staged", root / "data" / "02_clean"):
        for path in directory.rglob("*"):
            if path.suffix == ".parquet":
                texts.append(pd.read_parquet(path).to_csv())
            elif path.suffix in {".json", ".md"}:
                texts.append(path.read_text(encoding="utf-8"))
    return "\n".join(texts)


def test_receipts_pipeline(project: Path) -> None:
    root = str(project)
    for step in ("register-raw", "stage-receipts", "audit-receipts"):
        _invoke(step, "--root", root)

    clean = project / "data" / "02_clean" / "retail"
    report = json.loads((clean / "audit_report.json").read_text(encoding="utf-8"))
    assert report["completeness"]["receipt_files"] == 5
    assert report["completeness"]["valid_receipts"] == 4
    assert report["completeness"]["excluded_by_reason"] == {"repeated": 1}
    assert report["consistency"]["receipts_reconciled_within_tolerance"] == 5
    assert report["numbering"]["missing_numbers_by_series"] == {
        "factura E001, issuer 1 (2026-05 to 2026-05)": 2
    }
    assert report["traceability"]["corrections_by_rule"] == {"R302": 1, "R301": 1}
    assert report["confidentiality"]["customer_kind"] == {"company": 3, "person": 1}

    lines = pd.read_parquet(clean / "retail_lines.parquet")
    assert len(lines) == 3 * 2 + 2
    assert lines["issue_date"].min() == pd.Timestamp("2026-05-04")

    for personal in PERSONAL:
        assert personal not in _shared_text(project)
    customers = project / "data" / "private" / "retail_customers.parquet"
    assert stat.S_IMODE(customers.stat().st_mode) == 0o600
    assert set(pd.read_parquet(customers)["doc_number"]) == {"20123456789", "12345678"}

    privacy = runner.invoke(app, ["check-privacy", "--root", root])
    assert privacy.exit_code == 0, privacy.output
    assert "no customer name or DNI/RUC found" in privacy.output


def test_audit_refuses_changed_staged_receipts(project: Path) -> None:
    root = str(project)
    for step in ("register-raw", "stage-receipts"):
        _invoke(step, "--root", root)
    staged = project / "data" / "01_staged" / "retail" / "receipts.parquet"
    frame = pd.read_parquet(staged)
    frame.head(1).to_parquet(staged, index=False)
    result = runner.invoke(app, ["audit-receipts", "--root", root])
    assert result.exit_code == 1
    assert "differ from their manifest" in result.output


def test_stage_needs_registered_receipts(configs_copy: Path) -> None:
    (configs_copy / "datos").mkdir()
    (configs_copy / "datos" / "VENTAS_INTERNAS_X.xlsx").write_bytes(b"only the vecinos file")
    _invoke("register-raw", "--root", str(configs_copy))
    result = runner.invoke(app, ["stage-receipts", "--root", str(configs_copy)])
    assert result.exit_code == 1
    assert "no registered receipts" in result.output
