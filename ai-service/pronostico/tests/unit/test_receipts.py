from __future__ import annotations

from collections.abc import Callable
from datetime import date
from pathlib import Path
from typing import Any

import pytest

from pcsforecast.audit.anonymize import Anonymizer
from pcsforecast.ingest.receipts import (
    DeliveredReceipt,
    ParsedReceipt,
    ReceiptCustomer,
    Segment,
    TableLayout,
    customer_key,
    customer_kind,
    filing_folder,
    group_rows,
    parse_receipt,
    read_header,
    read_items,
    read_totals,
    segments,
    split_labels,
    stage_receipts,
    table_layout,
)

MakePdf = Callable[..., Path]


def word(text: str, x0: float, top: float, width: float = 20.0) -> dict[str, Any]:
    return {"text": text, "x0": x0, "x1": x0 + width, "top": top}


def test_factura_is_read_completely(receipt_pdf: MakePdf) -> None:
    receipt = parse_receipt(receipt_pdf("factura"))
    assert receipt.issues == []
    assert (receipt.doc_kind, receipt.series, receipt.number) == ("factura", "E001", 15)
    assert receipt.issuer_ruc == "20000000001"
    assert receipt.issue_date == date(2026, 5, 4)
    assert receipt.payment_form == "CONTADO"
    assert receipt.customer == ReceiptCustomer("RUC", "20123456789", "BETA COMERCIAL S.A.C.")
    assert receipt.totals["sale_value"] == 1300.0
    assert receipt.totals["total_amount"] == 1534.0
    assert [line["description"] for line in receipt.lines] == [
        "SSD KINGSTON 1TB NV2 (SN-ABC123-ABC124)",
        "MEMORIA RAM 16GB",
    ]
    assert [line["unit_value"] for line in receipt.lines] == [150.0, 1000.0]


def test_boleta_name_wraps_around_label_and_item_continues_on_next_page(
    receipt_pdf: MakePdf,
) -> None:
    receipt = parse_receipt(receipt_pdf("boleta"))
    assert receipt.issues == []
    assert receipt.n_pages == 2
    assert receipt.customer == ReceiptCustomer("DNI", "12345678", "GAMMA DELTA PRUEBA")
    assert receipt.has_observation
    assert [line["description"] for line in receipt.lines] == [
        "MOUSE LOGITECH M90 NEGRO",
        "TECLADO USB ESPAÑOL",
    ]
    assert sum(line["sale_amount"] for line in receipt.lines) == receipt.totals["total_amount"]


def test_address_is_never_kept(receipt_pdf: MakePdf) -> None:
    receipt = parse_receipt(receipt_pdf("factura"))
    assert "FICTICIA" not in repr(receipt)
    assert "LIMA" not in repr(receipt)


def test_split_labels_separates_fields_printed_on_one_row() -> None:
    assert split_labels("Fecha de Emisión : 01/02/2026 Forma de pago: Contado") == [
        ("Fecha de Emisión", "01/02/2026"),
        ("Forma de pago", "Contado"),
    ]
    assert split_labels("EMPRESA RUC: 20000000001") == [
        (None, "EMPRESA"),
        ("RUC", "20000000001"),
    ]
    assert split_labels("SIN ETIQUETA") == [(None, "SIN ETIQUETA")]


def test_segments_split_on_wide_gaps_but_keep_label_and_value_together() -> None:
    rows = group_rows(
        [
            word("Fecha", 19, 85),
            word(":", 150, 85.5, 3),
            word("01/02/2026", 156, 85),
            word("Forma", 400, 85),
            word("Importe", 19, 100),
            word("Total", 41, 100),
            word(":", 70, 100, 3),
            word("S/", 180, 100, 8),
        ]
    )
    assert [s.text for s in segments(rows)] == [
        "Fecha : 01/02/2026",
        "Forma",
        "Importe Total : S/",
    ]


def test_read_totals_takes_first_amount_of_each_label() -> None:
    parts = [
        Segment("Sub Total Ventas : S/ 1,300.00", 0, 0),
        Segment("SON: MIL SOLES ISC : S/ 0.00", 0, 0),
        Segment("Importe Total :", 0, 0),
        Segment("Importe Total : S/1,534.50", 0, 0),
        Segment("Importe Total : S/ 9.99", 0, 0),
    ]
    assert read_totals(parts) == {"subtotal": 1300.0, "total_amount": 1534.5}


def test_header_without_document_uses_name_and_issuer_comes_first() -> None:
    receipt = ParsedReceipt()
    parts = [
        Segment("BOLETA DE VENTA ELECTRONICA", 0, 0),
        Segment("RUC: 20000000001", 0, 0),
        Segment("EB01-9", 0, 0),
        Segment("Fecha de Emisión : 31/02/2026", 0, 0),
        Segment("Señor(es) : OMEGA", 0, 0),
        Segment("DE PRUEBA", 0, 0),
        Segment("Tipo de Moneda : SOLES", 0, 0),
        Segment("Cantidad Descripción", 0, 0),
        Segment("Señor(es) : IGNORADO", 0, 0),
    ]
    read_header(parts, receipt)
    assert receipt.issuer_ruc == "20000000001"
    assert receipt.issue_date is None  # 31 February
    assert receipt.customer == ReceiptCustomer("NONE", None, "OMEGA DE PRUEBA")


def test_table_layout_needs_its_headings() -> None:
    assert table_layout([word("Otros", 10, 10)], 100) is None
    assert table_layout([word("Cantidad", 40, 170)], 100) is None


def test_items_with_unreadable_amounts_are_reported() -> None:
    layout = TableLayout(top=170, bottom=300, qty_right=110, amount_left=280)
    words = [
        word("1.00", 85, 190),
        word("UNIDAD", 113, 190),
        word("MOUSE", 155, 190),
        word("50.00", 343, 190),
        word("EXTRA", 462, 190),
        word("59.00", 556, 190),
    ]
    lines, issues = read_items([(words, layout)], "boleta")
    assert lines == []
    assert issues == ["item_amounts_unreadable"]
    assert read_items([([], layout)], "factura") == ([], ["no_items"])


def test_text_that_is_not_a_receipt_reports_issues(tmp_path: Path, pdf_writer: MakePdf) -> None:
    receipt = parse_receipt(pdf_writer(tmp_path / "other.pdf", [[(20, 20, "CARTA")]]))
    assert receipt.issues == ["no_doc_kind", "no_series", "no_issue_date", "no_total"]


@pytest.mark.parametrize(
    ("customer", "kind", "key"),
    [
        (ReceiptCustomer("DNI", "12345678", "X"), "person", ("DNI:12345678", "document")),
        (ReceiptCustomer("RUC", "10123456789", "X"), "person", ("RUC:10123456789", "document")),
        (ReceiptCustomer("RUC", "20123456789", "X"), "company", ("RUC:20123456789", "document")),
        (ReceiptCustomer("NONE", None, "ALFA"), "unknown", ("NAME:ALFA", "name")),
        (ReceiptCustomer("NONE", None, None), "unknown", (None, "none")),
    ],
)
def test_customer_kind_and_key(
    customer: ReceiptCustomer, kind: str, key: tuple[str | None, str]
) -> None:
    assert customer_kind(customer) == kind
    assert customer_key(customer) == key


def test_filing_folder() -> None:
    folder = filing_folder("Boletas y Facturas/2024/Setiembre/Boletas/x.pdf")
    assert (folder.year, folder.month, folder.kind) == (2024, 9, "BOLETAS")
    assert filing_folder("x.pdf").year is None
    assert filing_folder("a/Año/Mes/Tipo/x.pdf").month is None


def test_staging_codes_customers_and_keeps_identity_apart(receipt_pdf: MakePdf) -> None:
    anonymizer = Anonymizer(b"k" * 32)
    delivered = [
        DeliveredReceipt(receipt_pdf("factura", "f.pdf"), "2026/Mayo/Factura/f.pdf", "a" * 64),
        DeliveredReceipt(receipt_pdf("boleta", "b.pdf"), "2026/Mayo/Boletas/b.pdf", "b" * 64),
    ]
    staged = stage_receipts(delivered, anonymizer)
    assert [r["customer_kind"] for r in staged.receipts] == ["company", "person"]
    assert all(str(r["customer_code"]).startswith("C") for r in staged.receipts)
    shared = repr(staged.receipts) + repr(staged.lines)
    for personal in ("BETA COMERCIAL", "20123456789", "GAMMA", "12345678"):
        assert personal not in shared
    assert {c["doc_number"] for c in staged.customers} == {"20123456789", "12345678"}
