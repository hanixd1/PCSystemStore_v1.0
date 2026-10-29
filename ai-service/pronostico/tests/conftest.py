from __future__ import annotations

import shutil
from collections.abc import Callable
from datetime import date, timedelta
from pathlib import Path

import openpyxl
import pytest
import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(autouse=True)
def _no_pretrained_weights(monkeypatch: pytest.MonkeyPatch) -> None:
    """Tests behave the same on hosts with and without the foundation extra: no Chronos."""
    from pcsforecast.models import registry  # noqa: PLC0415

    monkeypatch.setattr(registry, "foundation_available", lambda: False)


@pytest.fixture
def project_root() -> Path:
    return PROJECT_ROOT


@pytest.fixture
def configs_copy(tmp_path: Path) -> Path:
    """A writable copy of the project's configs/ under a temporary project root."""
    shutil.copytree(PROJECT_ROOT / "configs", tmp_path / "configs")
    return tmp_path


# --- synthetic receipt PDFs (fictitious customers only) ----------------------------------------

PAGE_HEIGHT = 792
FONT_SIZE = 8
Placed = tuple[float, float, str]  # x, top, text


def _pdf_text(text: str) -> bytes:
    raw = text.encode("cp1252")
    return raw.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")


def write_pdf(path: Path, pages: list[list[Placed]]) -> Path:
    """Minimal PDF with Helvetica text placed at (x, top) on each page."""
    objects: list[bytes] = [b"", b""]  # catalog and page tree, filled in below
    objects.append(
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
    )
    kids = []
    for placed in pages:
        stream = b"".join(
            b"BT /F1 %d Tf 1 0 0 1 %.2f %.2f Tm (" % (FONT_SIZE, x, PAGE_HEIGHT - top - FONT_SIZE)
            + _pdf_text(text)
            + b") Tj ET\n"
            for x, top, text in placed
        )
        objects.append(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"endstream")
        content = len(objects)
        objects.append(
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 %d] " % PAGE_HEIGHT
            + b"/Resources << /Font << /F1 3 0 R >> >> /Contents %d 0 R >>" % content
        )
        kids.append(len(objects))
    objects[0] = b"<< /Type /Catalog /Pages 2 0 R >>"
    objects[1] = b"<< /Type /Pages /Kids [%s] /Count %d >>" % (
        b" ".join(b"%d 0 R" % k for k in kids),
        len(kids),
    )
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % number + body + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    out += b"".join(b"%010d 00000 n \n" % offset for offset in offsets)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (
        len(objects) + 1,
        xref,
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(bytes(out))
    return path


ISSUER = [(19, 44.6, "EMPRESA EMISORA DE PRUEBA S.A.C."), (19, 55.9, "AV. DEL EMISOR 100")]


def factura_pages(number: int = 15, date: str = "04/05/2026") -> list[list[Placed]]:
    """A two-item factura laid out like SUNAT's printed representation (fictitious customer)."""
    return [
        [
            (437, 37.8, "FACTURA ELECTRONICA"),
            *ISSUER,
            (452, 49.8, "RUC: 20000000001"),
            (474, 61.8, f"E001-{number}"),
            (19, 85.3, "Fecha de Emisión"),
            (150, 85.3, f": {date}"),
            (330, 85.3, "Forma de pago: Contado"),
            (19, 96.0, "Señor(es)"),
            (150, 96.0, ": BETA COMERCIAL S.A.C."),
            (19, 106.5, "RUC"),
            (150, 106.5, ": 20123456789"),
            (159, 118.0, "AV. FICTICIA 123"),
            (19, 126.6, "Dirección del Cliente"),
            (150, 126.6, ": LIMA - LIMA"),
            (19, 145.9, "Tipo de Moneda"),
            (150, 145.9, ": SOLES"),
            (19, 156.5, "Observación"),
            (150, 156.5, ":"),
            (61.7, 171.7, "Cantidad"),
            (165.8, 171.7, "Unidad Medida"),
            (246.3, 171.7, "Descripción"),
            (512.5, 171.7, "Valor Unitario"),
            (70.5, 182.4, "2.00"),
            (178.1, 182.4, "UNIDAD"),
            (246.3, 182.4, "SSD KINGSTON 1TB NV2"),
            (572.3, 182.4, "150.00"),
            (246.3, 191.4, "(SN-ABC123-ABC124)"),
            (70.5, 201.3, "1.00"),
            (178.1, 201.3, "UNIDAD"),
            (246.3, 201.3, "MEMORIA RAM 16GB"),
            (572.3, 201.3, "1,000.00"),
            (45.8, 222.6, "Valor de Venta de Operaciones Gratuitas : S/ 0.00"),
            (330, 222.6, "Sub Total Ventas :"),
            (520, 222.6, "S/ 1,300.00"),
            (412.1, 234.1, "Valor Venta :"),
            (520, 234.1, "S/ 1,300.00"),
            (438.7, 245.5, "IGV :"),
            (520, 245.5, "S/ 234.00"),
            (398.6, 257.0, "Importe Total :"),
            (520, 257.0, "S/ 1,534.00"),
        ]
    ]


def boleta_pages(number: int = 7, date: str = "15/05/2026") -> list[list[Placed]]:
    """A boleta whose customer name wraps around its label and whose last item spills over."""
    first = [
        (414.8, 37.8, "BOLETA DE VENTA ELECTRONICA"),
        *ISSUER,
        (452.6, 49.8, "RUC: 20000000001"),
        (474.1, 61.8, f"EB01-{number}"),
        (19, 85.3, "Fecha de Vencimiento"),
        (100, 85.3, ":"),
        (19, 96.6, "Fecha de Emisión"),
        (100, 96.6, f": {date}"),
        (138.1, 107.9, "GAMMA"),
        (19, 113.3, "Señor(es)"),
        (100, 113.3, ":"),
        (138.1, 118.7, "DELTA PRUEBA"),
        (19, 130.1, "DNI"),
        (100, 130.1, ": 12345678"),
        (19, 141.4, "Tipo de Moneda"),
        (100, 141.4, ": SOLES"),
        (19, 152.7, "Observación"),
        (100, 152.7, ": RECOGE EN TIENDA"),
        (114.6, 168.6, "Unidad"),
        (42.2, 173.1, "Cantidad"),
        (183.4, 173.1, "Descripción"),
        (283.4, 173.1, "Valor Unitario(*)"),
        (400.1, 173.1, "Descuento(*)"),
        (498.3, 173.1, "Importe de Venta(**)"),
        (114.4, 177.6, "Medida"),
        (85.1, 188.3, "1.00"),
        (113.0, 188.3, "UNIDAD"),
        (155.0, 188.3, "MOUSE LOGITECH"),
        (343.1, 188.3, "50.00"),
        (462.7, 188.3, "0.00"),
        (556.6, 188.3, "59.00"),
        (155.0, 197.3, "M90 NEGRO"),
        (85.1, 760.0, "2.00"),
        (113.0, 760.0, "UNIDAD"),
        (155.0, 760.0, "TECLADO"),
        (343.1, 760.0, "25.00"),
        (462.7, 760.0, "0.00"),
        (556.6, 760.0, "59.00"),
    ]
    second = [
        (155.0, 20.0, "USB ESPAÑOL"),
        (540.0, 36.0, ":"),
        (423.4, 42.7, "Otros Cargos : S/ 0.00"),
        (423.9, 56.8, "Importe Total : S/ 118.00"),
        (29.6, 90.0, "Esta es una representación impresa de la Boleta de Venta Electrónica"),
    ]
    return [first, second]


@pytest.fixture
def receipt_pdf(tmp_path: Path):  # type: ignore[no-untyped-def]
    """Writes a synthetic factura or boleta and returns its path."""

    def make(kind: str, name: str = "receipt.pdf", **layout: object) -> Path:
        pages = factura_pages(**layout) if kind == "factura" else boleta_pages(**layout)  # type: ignore[arg-type]
        return write_pdf(tmp_path / name, pages)

    return make


@pytest.fixture
def pdf_writer() -> Callable[[Path, list[list[Placed]]], Path]:
    """The raw PDF writer, for layouts other than the two receipt templates."""
    return write_pdf


# --- synthetic project: a year of daily sheets (fictitious customers only) ----------------------

HEADER: list[object] = ["CANT", "PRODUCTO", "MONTO", "PASE", "SERIE", "OBS"]
PRODUCTS = ["DISCO SOLIDO KINGSTON 1TB NV2", "MEMORIA RAM PATRIOT 8GB", "MOUSE LOGITECH G203"]


def _write_year(path: Path) -> None:
    workbook = openpyxl.Workbook()
    workbook.remove(workbook.active)
    day = date(2024, 1, 3)
    index = 0
    while day <= date(2024, 12, 20):
        sheet = workbook.create_sheet(day.strftime("%d-%m-%y"))
        sheet.append(HEADER)
        total = 0
        for offset, product in enumerate(PRODUCTS):
            if (index + offset) % (offset + 2) == 0:
                quantity = 1 + (index % 3 if offset == 0 else 0)
                sheet.append([quantity, product, 100 * quantity, "ALFA", None, "PAGO"])
                total += 100 * quantity
        sheet.append([None, "DISCO SOLIDO KINGSTON 1TB NV2", None, "BETA", None, "DEV"])
        sheet.append([None, "TOTAL", total])
        day += timedelta(days=3)
        index += 1
    workbook.save(path)


@pytest.fixture
def project(configs_copy: Path) -> Path:
    (configs_copy / "datos").mkdir()
    _write_year(configs_copy / "datos" / "VENTAS_INTERNAS_YEAR.xlsx")
    protocol_path = configs_copy / "configs" / "protocol.yaml"
    protocol = yaml.safe_load(protocol_path.read_text(encoding="utf-8"))
    protocol["final_test"]["last_complete_months"] = 2
    protocol["frequencies"]["weekly"]["min_train_periods"] = 8
    protocol["frequencies"]["weekly"]["window"]["length"] = 8
    protocol["frequencies"]["weekly"]["truncated_length"] = 4
    protocol["frequencies"]["monthly"]["min_train_periods"] = 3
    protocol["frequencies"]["monthly"]["window"]["length"] = 3
    protocol["frequencies"]["monthly"]["truncated_length"] = 2
    protocol_path.write_text(yaml.safe_dump(protocol), encoding="utf-8")
    return configs_copy
