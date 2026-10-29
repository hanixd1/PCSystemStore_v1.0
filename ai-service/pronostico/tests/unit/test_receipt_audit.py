from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

from pcsforecast.audit.receipts import (
    audit_receipts,
    build_receipt_report,
    coverage_by_month,
    folder_corrections,
)
from pcsforecast.privacy import (
    RETAIL_CUSTOMERS_FILE,
    known_identifiers,
    save_retail_customers,
    scan_for_document_numbers,
)

ISSUER = "20000000001"


def receipt(
    path: str, number: int, issued: str, kind: str = "factura", **extra: Any
) -> dict[str, Any]:
    year, month = (int(v) for v in path.split("/")[:2])
    row: dict[str, Any] = {
        "raw_path": path,
        "source_sha256": "a" * 64,
        "folder_year": year,
        "folder_month": month,
        "folder_kind": "FACTURA" if kind == "factura" else "BOLETAS",
        "doc_kind": kind,
        "issuer_ruc": ISSUER,
        "series": "E001" if kind == "factura" else "EB01",
        "number": number,
        "issue_date": pd.Timestamp(issued),
        "currency": "SOLES",
        "payment_form": "CONTADO",
        "has_observation": False,
        "customer_code": "C0123456789",
        "customer_kind": "company",
        "customer_basis": "document",
        "total_amount": 118.0,
        "igv_amount": 18.0,
        "sale_value": 100.0,
        "taxed_value": None,
        "n_pages": 1,
        "n_lines": 1,
        "issues": "",
    }
    return {**row, **extra}


def line(path: str, unit_value: float = 50.0, sale_amount: float | None = None) -> dict[str, Any]:
    return {
        "raw_path": path,
        "line_no": 1,
        "quantity": 2.0,
        "unit": "UNIDAD",
        "description": "SSD 1TB",
        "unit_value": unit_value,
        "discount": None,
        "sale_amount": sale_amount,
    }


def staged() -> tuple[pd.DataFrame, pd.DataFrame]:
    receipts = pd.DataFrame(
        [
            receipt("2026/05/a.pdf", 10, "2026-05-02"),
            receipt("2026/05/b.pdf", 13, "2026-05-20"),  # numbers 11 and 12 missing in May
            receipt("2026/06/c.pdf", 14, "2026-05-31"),  # filed under June (R301)
            receipt("2026/06/d.pdf", 14, "2026-05-31"),  # the same receipt filed twice (R303)
            receipt("2026/06/e.pdf", 20, "2026-06-03"),  # gap 15-19 spans May and June
            receipt("2026/06/f.pdf", 21, "2026-06-04"),  # items do not add up (R304)
            receipt("2026/06/g.pdf", 5, "2026-06-05", kind="boleta", folder_kind="FACTURA"),
            receipt("2026/06/h.pdf", 22, "2026-06-06", issues="no_items"),
        ]
    )
    lines = pd.DataFrame(
        [
            *(line(f"2026/0{m}/{n}.pdf") for m, n in [(5, "a"), (5, "b"), (6, "c"), (6, "d")]),
            line("2026/06/e.pdf"),
            line("2026/06/f.pdf", unit_value=40.0),
            line("2026/06/g.pdf", unit_value=50.0, sale_amount=59.0),
            line("2026/06/g.pdf", unit_value=50.0, sale_amount=59.0) | {"line_no": 2},
        ]
    )
    return receipts, lines


def test_receipts_are_classified_by_rule() -> None:
    audit = audit_receipts(*staged())
    reasons = audit.receipts.set_index("raw_path")["exclusion_reason"]
    assert reasons.isna().sum() == 5
    assert reasons["2026/06/d.pdf"] == "repeated"
    assert reasons["2026/06/f.pdf"] == "does_not_reconcile"
    assert reasons["2026/06/h.pdf"] == "unreadable"
    assert set(audit.lines["receipt_key"]) == {f"{ISSUER}-E001-{n}" for n in (10, 13, 14, 20)} | {
        f"{ISSUER}-EB01-5"
    }
    assert audit.lines["net_amount"].tolist()[:1] == [100.0]


def test_folder_mismatches_are_logged() -> None:
    receipts, _ = staged()
    corrections = folder_corrections(receipts)
    logged = corrections.set_index(["line_id", "rule_id"])
    assert logged.loc[("2026/06/c.pdf", "R301"), "corrected"] == "2026-05"
    assert logged.loc[("2026/06/g.pdf", "R302"), "original"] == "factura"
    no_folder = receipts.assign(folder_year=None, folder_month=None, folder_kind=None)
    assert set(folder_corrections(no_folder.head(1))["original"].isna()) == {True}


def test_numbering_gaps_and_monthly_coverage() -> None:
    audit = audit_receipts(*staged())
    gaps = audit.gaps.set_index("after_number")
    assert gaps.loc[10, "missing"] == 2
    assert gaps.loc[10, "month"] == "2026-05"
    assert pd.isna(gaps.loc[14, "month"])
    coverage = coverage_by_month(audit.receipts, audit.gaps).set_index(["month", "doc_kind"])
    may = coverage.loc[("2026-05", "factura")]
    assert (may["delivered"], may["missing_within_month"]) == (3, 2)
    assert may["delivered_share"] == 3 / 5


def test_report_lists_counts_only() -> None:
    audit = audit_receipts(*staged())
    report = build_receipt_report(audit, coverage_by_month(audit.receipts, audit.gaps))
    assert report["completeness"]["valid_receipts"] == 5
    assert report["completeness"]["excluded_by_reason"] == {
        "repeated": 1,
        "does_not_reconcile": 1,
        "unreadable": 1,
    }
    assert report["numbering"]["missing_numbers_by_series"] == {
        "factura E001, issuer 1 (2026-05 to 2026-06)": 7,
    }
    assert "C0123456789" not in repr(report)


def test_retail_identities_are_private_and_searched(tmp_path: Path) -> None:
    private = tmp_path / "private"
    private.mkdir()
    save_retail_customers(
        [
            {
                "customer_code": "Caaaaaaaaaa",
                "doc_type": "DNI",
                "doc_number": "12345678",
                "customer_name": "GAMMA PRUEBA",
            },
            {
                "customer_code": "Cbbbbbbbbbb",
                "doc_type": "NONE",
                "doc_number": None,
                "customer_name": "ALFA",
            },
        ],
        private,
    )
    assert oct((private / RETAIL_CUSTOMERS_FILE).stat().st_mode)[-3:] == "600"
    assert known_identifiers(private) == {
        "GAMMA PRUEBA": "Caaaaaaaaaa",
        "12345678": "Caaaaaaaaaa",
        "ALFA": "Cbbbbbbbbbb",
    }


def test_bare_document_numbers_in_customer_columns_are_found(tmp_path: Path) -> None:
    out = tmp_path / "out"
    out.mkdir()
    pd.DataFrame({"customer_code": ["12345678", "Caaaaaaaaaa", "20123456789"]}).to_parquet(
        out / "leak.parquet"
    )
    pd.DataFrame({"description": ["12345678"]}).to_parquet(out / "fine.parquet")
    (out / "notes.md").write_text("12345678", encoding="utf-8")
    findings = scan_for_document_numbers([out], tmp_path)
    assert [(f.file, f.field, f.occurrences) for f in findings] == [
        ("out/leak.parquet", "customer_code", 2)
    ]
    assert scan_for_document_numbers([out / "leak.parquet"], tmp_path)[0].occurrences == 2
