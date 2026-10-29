"""Extraction of the retail channel's electronic receipts (facturas and boletas).

The PDFs are SUNAT's printed representation of electronic receipts. Words are read with their
position on the page: the item table is split into columns by the x position of its headings, so
descriptions that wrap over several lines stay with their item.

Personal data on a receipt: the customer's name, DNI or RUC and address (Law 29733). The address
is never read. Name and document number exist only in memory, inside ``ReceiptCustomer``; the
staged tables receive the keyed-hash customer code instead (rule R208).
"""

from __future__ import annotations

import math
import re
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field, replace
from datetime import date, datetime
from pathlib import Path
from typing import Any

import pdfplumber

from pcsforecast.audit.anonymize import Anonymizer
from pcsforecast.text import normalize_text

DOC_KINDS = {"FACTURA ELECTRONICA": "factura", "BOLETA DE VENTA ELECTRONICA": "boleta"}
AMOUNT_COLUMNS = {
    "factura": ("unit_value",),
    "boleta": ("unit_value", "discount", "sale_amount"),
}
# Totals printed below the item table, by their printed label.
TOTAL_LABELS = {
    "Importe Total": "total_amount",
    "IGV": "igv_amount",
    "Valor Venta": "sale_value",
    "Sub Total Ventas": "subtotal",
    "Op. Gravada": "taxed_value",
    "Descuentos": "discount_total",
    "Anticipos": "advance_total",
    "Valor de Venta de Operaciones Gratuitas": "free_value",
}
FOOTER_PREFIXES = (
    "Valor de Venta de Operaciones",
    "Sub Total",
    "Otros Cargos",
    "Otros Tributos",
    "Importe Total",
    "Op. Gravada",
    "SON:",
)
CUSTOMER_DOC_LABELS = ("RUC", "DNI")
NAME_LABEL = "Señor(es)"
ADDRESS_LABEL = "Dirección del Cliente"
HEADER_LABELS = (
    "Fecha de Emisión",
    "Fecha de Vencimiento",
    NAME_LABEL,
    ADDRESS_LABEL,
    "Tipo de Moneda",
    "Observación",
    "Forma de pago",
    *CUSTOMER_DOC_LABELS,
)

_SERIES = re.compile(r"^(?P<series>[A-Z]{1,2}\d{2,3})-(?P<number>\d{1,8})$")
_NUMBER = re.compile(r"^-?\d[\d,]*(\.\d+)?$")
ROW_TOLERANCE = 2.0
SEGMENT_GAP = 10.0
HEADING_SPREAD = 8.0
AMOUNT_MARGIN = 6.0


def to_number(text: str) -> float:
    return float(text.replace(",", ""))


@dataclass(frozen=True)
class ReceiptCustomer:
    """Customer identity as printed. Lives only in memory (personal data)."""

    doc_type: str  # RUC, DNI or NONE
    doc_number: str | None
    name: str | None


@dataclass
class ParsedReceipt:
    """Everything read from one receipt; ``customer`` must not be persisted outside private."""

    doc_kind: str | None = None
    issuer_ruc: str | None = None
    series: str | None = None
    number: int | None = None
    issue_date: date | None = None
    currency: str | None = None
    payment_form: str | None = None
    has_observation: bool = False
    n_pages: int = 0
    totals: dict[str, float] = field(default_factory=dict)
    customer: ReceiptCustomer = ReceiptCustomer("NONE", None, None)
    lines: list[dict[str, Any]] = field(default_factory=list)
    issues: list[str] = field(default_factory=list)


# --- header and totals (text segments) ------------------------------------------------------


@dataclass(frozen=True)
class Segment:
    """Words of one visual row that are printed together (no wide gap between them)."""

    text: str
    top: float
    x0: float


def segments(rows: Iterable[list[dict[str, Any]]]) -> list[Segment]:
    """Split every row at horizontal gaps wider than ``SEGMENT_GAP`` (see ``_breaks``)."""
    result: list[Segment] = []
    for row in rows:
        current = [row[0]]
        for word in row[1:]:
            if _breaks(current[-1], word):
                result.append(_segment(current))
                current = []
            current.append(word)
        result.append(_segment(current))
    return result


def _breaks(left: dict[str, Any], right: dict[str, Any]) -> bool:
    """A wide gap starts a new segment, except between a label's colon and its neighbours."""
    joined = str(left["text"]).endswith(":") or str(right["text"]).startswith(":")
    return right["x0"] - left["x1"] > SEGMENT_GAP and not joined


def _segment(words: list[dict[str, Any]]) -> Segment:
    return Segment(" ".join(w["text"] for w in words), words[0]["top"], words[0]["x0"])


_HEADER_LABEL = re.compile(
    r"(?P<label>" + "|".join(re.escape(label) for label in HEADER_LABELS) + r")\s*:"
)


def split_labels(text: str) -> list[tuple[str | None, str]]:
    """``(label, value)`` parts of a segment; text before the first label has label ``None``."""
    matches = list(_HEADER_LABEL.finditer(text))
    if not matches:
        return [(None, text.strip())]
    parts: list[tuple[str | None, str]] = []
    if text[: matches[0].start()].strip():
        parts.append((None, text[: matches[0].start()].strip()))
    for match, following in zip(matches, [*matches[1:], None], strict=True):
        end = following.start() if following is not None else len(text)
        parts.append((match["label"], text[match.end() : end].strip()))
    return parts


@dataclass
class _HeaderReader:
    """Reads labelled header fields. The customer's name may wrap above and below its label."""

    receipt: ParsedReceipt
    fields: dict[str, str] = field(default_factory=dict)
    current: str | None = None
    pending: list[str] = field(default_factory=list)

    def feed(self, label: str | None, value: str) -> None:
        if label is None:
            self._unlabelled(value)
            return
        before, self.pending = self.pending, []
        if label in CUSTOMER_DOC_LABELS and NAME_LABEL not in self.fields:
            self.receipt.issuer_ruc = self.receipt.issuer_ruc or value or None
            self.current = None
            return
        self.current = label
        if label == ADDRESS_LABEL:
            # The address is personal data the study does not need: never kept.
            return
        if label == NAME_LABEL:
            value = " ".join([*before, value])
        self.fields.setdefault(label, value)

    def _unlabelled(self, value: str) -> None:
        if self.current == NAME_LABEL:
            self.fields[NAME_LABEL] = f"{self.fields[NAME_LABEL]} {value}"
        elif self.current != ADDRESS_LABEL:
            self.pending.append(value)

    def finish(self) -> None:
        receipt, fields = self.receipt, self.fields
        receipt.currency = normalize_text(fields.get("Tipo de Moneda"))
        receipt.payment_form = normalize_text(fields.get("Forma de pago"))
        receipt.has_observation = bool(normalize_text(fields.get("Observación")))
        receipt.issue_date = _parse_date(fields.get("Fecha de Emisión"))
        doc_type = next((label for label in CUSTOMER_DOC_LABELS if fields.get(label)), "NONE")
        receipt.customer = ReceiptCustomer(
            doc_type=doc_type,
            doc_number=fields.get(doc_type) if doc_type != "NONE" else None,
            name=normalize_text(fields.get(NAME_LABEL)),
        )


def _parse_date(text: str | None) -> date | None:
    if not text:
        return None
    try:
        return datetime.strptime(text.strip(), "%d/%m/%Y").date()  # noqa: DTZ007 (calendar date)
    except ValueError:
        return None


def _identify(text: str, receipt: ParsedReceipt) -> bool:
    """Document kind or series-number segment; ``True`` when the segment was one of them."""
    if receipt.doc_kind is None and text in DOC_KINDS:
        receipt.doc_kind = DOC_KINDS[text]
        return True
    series = _SERIES.match(text)
    if series is not None and receipt.series is None:
        receipt.series, receipt.number = series["series"], int(series["number"])
        return True
    return False


def read_header(parts: Sequence[Segment], receipt: ParsedReceipt) -> None:
    """Document kind, series-number, dates, customer and payment fields."""
    reader = _HeaderReader(receipt)
    for part in parts:
        if part.text.startswith("Cantidad"):
            break
        if _identify(part.text, receipt):
            continue
        for label, value in split_labels(part.text):
            reader.feed(label, value)
    reader.finish()


_TOTAL = re.compile(
    r"(?P<label>"
    + "|".join(re.escape(label) for label in sorted(TOTAL_LABELS, key=len, reverse=True))
    + r")\s*:\s*S/\s*(?P<amount>-?\d[\d,]*\.\d+)"
)


def read_totals(parts: Iterable[Segment]) -> dict[str, float]:
    """Amounts printed as ``label : S/ amount``, by column name (first occurrence)."""
    totals: dict[str, float] = {}
    for part in parts:
        for match in _TOTAL.finditer(part.text):
            totals.setdefault(TOTAL_LABELS[match["label"]], to_number(match["amount"]))
    return totals


# --- item table (positioned words) -----------------------------------------------------------


@dataclass(frozen=True)
class TableLayout:
    """Positions taken from the item table's heading row."""

    top: float
    bottom: float
    qty_right: float
    amount_left: float


def table_layout(words: Sequence[dict[str, Any]], footer_top: float) -> TableLayout | None:
    """Quantities end before the "Unidad" heading; amounts start at the first "Valor" heading."""
    heading = next((w for w in words if w["text"] == "Cantidad"), None)
    if heading is None:
        return None
    near = [w for w in words if abs(w["top"] - heading["top"]) <= HEADING_SPREAD]
    unit = next((w for w in near if w["text"].startswith("Unidad")), None)
    value = next((w for w in near if w["text"] == "Valor"), None)
    if unit is None or value is None:
        return None
    return TableLayout(
        top=max(w["top"] for w in near),
        bottom=footer_top,
        qty_right=unit["x0"],
        amount_left=value["x0"] - AMOUNT_MARGIN,
    )


def group_rows(words: Iterable[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    """Words grouped into visual rows (same top within a tolerance), each sorted by x."""
    rows: list[list[dict[str, Any]]] = []
    for word in sorted(words, key=lambda w: (w["top"], w["x0"])):
        if rows and abs(rows[-1][0]["top"] - word["top"]) <= ROW_TOLERANCE:
            rows[-1].append(word)
        else:
            rows.append([word])
    return [sorted(row, key=lambda w: w["x0"]) for row in rows]


@dataclass
class _Item:
    quantity: float
    unit: str | None
    description: list[str] = field(default_factory=list)
    amounts: list[str] = field(default_factory=list)


def _start_item(row: list[dict[str, Any]], layout: TableLayout) -> _Item | None:
    first = row[0]
    if first["x1"] > layout.qty_right or not _NUMBER.match(first["text"]):
        return None
    rest = row[1:]
    unit = rest[0]["text"] if rest and rest[0]["x0"] < layout.amount_left else None
    item = _Item(quantity=to_number(first["text"]), unit=unit)
    _extend(item, rest[1:] if unit is not None else rest, layout)
    return item


def _extend(item: _Item, words: Iterable[dict[str, Any]], layout: TableLayout) -> None:
    for word in words:
        if word["x0"] < layout.amount_left:
            item.description.append(word["text"])
        elif word["text"] != ":":  # a stray colon of the totals block printed just above it
            item.amounts.append(word["text"])


def read_items(
    pages: Sequence[tuple[Sequence[dict[str, Any]], TableLayout]], doc_kind: str
) -> tuple[list[dict[str, Any]], list[str]]:
    """Item lines between the heading row and the footer; an item may continue on the next page."""
    items: list[_Item] = []
    for words, layout in pages:
        body = [w for w in words if layout.top + ROW_TOLERANCE < w["top"] < layout.bottom]
        for row in group_rows(body):
            started = _start_item(row, layout)
            if started is not None:
                items.append(started)
            elif items:
                _extend(items[-1], row, layout)
    if not items:
        return [], ["no_items"]
    columns = AMOUNT_COLUMNS[doc_kind]
    lines: list[dict[str, Any]] = []
    issues: list[str] = []
    for number, item in enumerate(items, start=1):
        amounts = [a for a in item.amounts if _NUMBER.match(a)]
        if len(amounts) != len(columns) or len(amounts) != len(item.amounts):
            issues.append("item_amounts_unreadable")
            continue
        lines.append(
            {
                "line_no": number,
                "quantity": item.quantity,
                "unit": item.unit,
                "description": normalize_text(" ".join(item.description)),
                **{c: to_number(a) for c, a in zip(columns, amounts, strict=True)},
            }
        )
    return lines, issues


def _footer_top(parts: Sequence[Segment], below: float) -> float:
    tops = [p.top for p in parts if p.top > below and p.text.startswith(FOOTER_PREFIXES)]
    return min(tops) if tops else float("inf")


# --- one receipt -----------------------------------------------------------------------------


def parse_receipt(path: Path) -> ParsedReceipt:
    """Read one receipt PDF. Never raises on content: problems go to ``issues``."""
    receipt = ParsedReceipt()
    with pdfplumber.open(path) as pdf:
        pages = [page.extract_words() for page in pdf.pages]
    receipt.n_pages = len(pages)
    page_parts = [segments(group_rows(words)) for words in pages]
    read_header(page_parts[0], receipt)
    receipt.totals = read_totals(part for parts in page_parts for part in parts)
    _check_header(receipt)
    if receipt.doc_kind is None:
        return receipt
    heading_top = next((w["top"] for w in pages[0] if w["text"] == "Cantidad"), 0.0)
    layout = table_layout(pages[0], _footer_top(page_parts[0], heading_top))
    if layout is None:
        receipt.issues.append("no_item_table")
        return receipt
    table = [(pages[0], layout)]
    # The table continues on the next page, with the same columns, until a footer is found.
    for words, parts in zip(pages[1:], page_parts[1:], strict=True):
        if math.isfinite(table[-1][1].bottom):
            break
        table.append((words, replace(layout, top=-ROW_TOLERANCE, bottom=_footer_top(parts, 0.0))))
    receipt.lines, issues = read_items(table, receipt.doc_kind)
    receipt.issues.extend(issues)
    return receipt


def _check_header(receipt: ParsedReceipt) -> None:
    required = {
        "no_doc_kind": receipt.doc_kind,
        "no_series": receipt.series,
        "no_issue_date": receipt.issue_date,
        "no_total": receipt.totals.get("total_amount"),
    }
    receipt.issues.extend(code for code, value in required.items() if value is None)


# --- staging: receipts → tables without personal data -----------------------------------------

MONTHS = {
    name: number
    for number, names in enumerate(
        [
            ("ENERO",),
            ("FEBRERO",),
            ("MARZO",),
            ("ABRIL",),
            ("MAYO",),
            ("JUNIO",),
            ("JULIO",),
            ("AGOSTO",),
            ("SETIEMBRE", "SEPTIEMBRE"),
            ("OCTUBRE",),
            ("NOVIEMBRE",),
            ("DICIEMBRE",),
        ],
        start=1,
    )
    for name in names
}
PERSON_RUC_PREFIXES = ("10", "15", "17")
COMPANY_RUC_PREFIX = "20"
PRIVATE_COLUMNS = ("customer_code", "doc_type", "doc_number", "customer_name")


def customer_kind(customer: ReceiptCustomer) -> str:
    """``person`` (DNI or a natural person's RUC), ``company`` (RUC 20) or ``unknown``."""
    number = customer.doc_number or ""
    if customer.doc_type == "DNI" or number.startswith(PERSON_RUC_PREFIXES):
        return "person"
    return "company" if number.startswith(COMPANY_RUC_PREFIX) else "unknown"


def customer_key(customer: ReceiptCustomer) -> tuple[str | None, str]:
    """Text that is hashed into the customer code, and what it is based on (rule R306)."""
    if customer.doc_number:
        return f"{customer.doc_type}:{customer.doc_number}", "document"
    if customer.name:
        return f"NAME:{customer.name}", "name"
    return None, "none"


@dataclass(frozen=True)
class Folder:
    year: int | None
    month: int | None
    kind: str | None


def filing_folder(raw_path: str) -> Folder:
    """Year, month and kind of the ``.../<year>/<month>/<kind>/<file>`` folders, if present."""
    parts = Path(raw_path).parts
    if len(parts) < 4:  # noqa: PLR2004 (year/month/kind/file)
        return Folder(None, None, None)
    year, month, kind = parts[-4], normalize_text(parts[-3]), parts[-2]
    return Folder(
        int(year) if year.isdigit() else None,
        MONTHS.get(month or ""),
        normalize_text(kind),
    )


@dataclass(frozen=True)
class DeliveredReceipt:
    path: Path
    raw_path: str
    sha256: str


@dataclass(frozen=True)
class StagedReceipts:
    receipts: list[dict[str, Any]]
    lines: list[dict[str, Any]]
    customers: list[dict[str, str | None]]  # private: name and document number


def stage_receipt(
    delivered: DeliveredReceipt, receipt: ParsedReceipt, code: str | None, basis: str
) -> dict[str, Any]:
    folder = filing_folder(delivered.raw_path)
    return {
        "raw_path": delivered.raw_path,
        "source_sha256": delivered.sha256,
        "folder_year": folder.year,
        "folder_month": folder.month,
        "folder_kind": folder.kind,
        "doc_kind": receipt.doc_kind,
        "issuer_ruc": receipt.issuer_ruc,
        "series": receipt.series,
        "number": receipt.number,
        "issue_date": receipt.issue_date,
        "currency": receipt.currency,
        "payment_form": receipt.payment_form,
        "has_observation": receipt.has_observation,
        "customer_code": code,
        "customer_kind": customer_kind(receipt.customer),
        "customer_basis": basis,
        **{
            column: receipt.totals.get(column)
            for column in ("total_amount", "igv_amount", "sale_value", "taxed_value")
        },
        "n_pages": receipt.n_pages,
        "n_lines": len(receipt.lines),
        "issues": ";".join(receipt.issues),
    }


def stage_receipts(delivered: Iterable[DeliveredReceipt], anonymizer: Anonymizer) -> StagedReceipts:
    """Read every receipt; customers leave as codes, their identity only in ``customers``."""
    receipts: list[dict[str, Any]] = []
    lines: list[dict[str, Any]] = []
    customers: dict[tuple[str | None, str | None], dict[str, str | None]] = {}
    for item in delivered:
        receipt = parse_receipt(item.path)
        key, basis = customer_key(receipt.customer)
        code = anonymizer.code(key)
        receipts.append(stage_receipt(item, receipt, code, basis))
        lines.extend({"raw_path": item.raw_path, **line} for line in receipt.lines)
        if code is not None:
            customer = receipt.customer
            customers.setdefault(
                (code, customer.name),
                dict(
                    zip(
                        PRIVATE_COLUMNS,
                        (code, customer.doc_type, customer.doc_number, customer.name),
                        strict=True,
                    )
                ),
            )
    return StagedReceipts(receipts, lines, list(customers.values()))
