from __future__ import annotations

from datetime import date, datetime

from pcsforecast.audit.anonymize import Anonymizer
from pcsforecast.ingest.vecinos_workbook import (
    extract_sheet,
    is_header,
    is_total,
    pseudonymise,
    raw_text,
)

SHA = "a" * 64
HEADER = ("CANT", "PRODUCTO", "MONTO", "PASE", "SERIE", "OBS")


def test_raw_text() -> None:
    assert raw_text(None) is None
    assert raw_text(1) == "1"
    assert raw_text("  x ") == "  x "
    assert raw_text(datetime(2024, 4, 26)) == "2024-04-26T00:00:00"
    assert raw_text(date(2024, 4, 26)) == "2024-04-26"


def test_markers() -> None:
    assert is_header([" cant ", "Producto"])
    assert not is_header(["CANT"])
    assert is_total([None, " total ", 783])
    assert not is_total([None])


def test_single_block_with_template_rows_and_total() -> None:
    rows = [
        HEADER,
        (1, "SSD 1TB", 215, "DELTA", "SN1", "PAGO"),
        (1, None, None, None, None, None),
        (None, None, None, None, None, None, "GASTOS:"),
        (None, "TOTAL", 215),
    ]
    result = extract_sheet(rows, SHA, 7, "03-01-24")
    assert result.n_headers == 1
    assert [line["excel_row"] for line in result.lines] == [2, 3]
    first = result.lines[0]
    assert first["line_id"] == f"{SHA[:12]}:7:2"
    assert first["producto_raw"] == "SSD 1TB"
    assert first["monto_raw"] == "215"
    assert first["row_kind"] == "line"
    assert result.blocks == [
        {
            "source_sha256": SHA,
            "sheet_index": 7,
            "block": 0,
            "header_row": 1,
            "total_row": 5,
            "total_raw": "215",
        }
    ]


def test_second_block_and_rows_outside_blocks() -> None:
    rows = [
        HEADER,
        (1, "A", 10, "X", None, "PAGO"),
        (None, "TOTAL", 10),
        (1, "STRAY", 5, None, None, None),
        HEADER,
        (2, "B", 20, "Y", None, "debe"),
        (None, "TOTAL", 20),
    ]
    result = extract_sheet(rows, SHA, 0, "14-09-2026")
    assert result.n_headers == 2
    assert [(line["block"], line["row_kind"]) for line in result.lines] == [
        (0, "line"),
        (0, "outside_block"),
        (1, "line"),
    ]
    assert [(b["block"], b["header_row"], b["total_row"]) for b in result.blocks] == [
        (0, 1, 3),
        (1, 5, 7),
    ]


def test_block_without_total_is_closed_at_the_end() -> None:
    rows = [HEADER, (1, "A", 10, None, None, None)]
    result = extract_sheet(rows, SHA, 0, "19-02-24")
    assert result.blocks[0]["total_row"] is None


def test_rows_before_a_late_header_form_their_own_block() -> None:
    rows = [(1, "A", 10), HEADER, (1, "B", 5)]
    result = extract_sheet(rows, SHA, 0, "x")
    assert [line["block"] for line in result.lines] == [0, 1]
    assert [b["header_row"] for b in result.blocks] == [None, 2]


def test_empty_sheet() -> None:
    result = extract_sheet([], SHA, 0, "Hoja1")
    assert (result.lines, result.blocks, result.n_headers) == ([], [], 0)


def test_short_rows_and_columns_beyond_f_are_ignored() -> None:
    rows = [
        HEADER,
        (1, "A"),
        (1, "B", 5, None, None, None, "COMPRA", 120, None, datetime(2026, 5, 11)),
        (None, None, None, None, None, None, "ALMUERZO", 15),
    ]
    result = extract_sheet(rows, SHA, 0, "x")
    assert len(result.lines) == 2
    assert result.lines[0]["monto_raw"] is None
    assert "row_date" not in result.lines[1]
    assert result.lines[1]["obs_raw"] is None


def test_pseudonymise_replaces_names_by_codes() -> None:
    anonymizer = Anonymizer(b"k" * 32)
    lines: list[dict[str, object]] = [
        {"pase_raw": "  alfa "},
        {"pase_raw": "ALFA"},
        {"pase_raw": None},
    ]
    pseudonymise(lines, anonymizer)
    assert all("pase_raw" not in line for line in lines)
    assert lines[0]["customer_code"] == lines[1]["customer_code"] == anonymizer.code("ALFA")
    assert lines[2]["customer_code"] is None
