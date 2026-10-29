"""Extraction of the vecinos workbook into the transactional extraction sheet (Annex 03).

Nothing is interpreted here: every non-empty row of columns A-F is kept as raw text with its
sheet and row of origin. Columns G onwards hold the shop's own purchases and expenses
(confirmed by the company on 2026-10-21) and are not read. Classification and corrections
happen in ``pcsforecast.audit``.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

import openpyxl
import pandas as pd

from pcsforecast.audit.anonymize import Anonymizer
from pcsforecast.schemas.extraction import StagedBlock, StagedLine, StagedSheet
from pcsforecast.text import normalize_text

LINE_COLUMNS = ("cant_raw", "producto_raw", "monto_raw", "pase_raw", "serie_raw", "obs_raw")
N_LINE_COLUMNS = len(LINE_COLUMNS)
HEADER_MARKERS = ("CANT", "PRODUCTO")
TOTAL_MARKER = "TOTAL"


def raw_text(value: object) -> str | None:
    """Lossless text form of a cell value; ``None`` for empty cells."""
    if value is None:
        return None
    if isinstance(value, datetime | date):
        return value.isoformat()
    return str(value)


def _upper(value: object) -> str:
    return str(value).strip().upper() if value is not None else ""


def is_header(cells: Sequence[object]) -> bool:
    return tuple(_upper(c) for c in cells[:2]) == HEADER_MARKERS


def is_total(cells: Sequence[object]) -> bool:
    return len(cells) > 1 and _upper(cells[1]) == TOTAL_MARKER


@dataclass
class SheetExtraction:
    """Rows, blocks and header count of one worksheet."""

    lines: list[dict[str, object]] = field(default_factory=list)
    blocks: list[dict[str, object]] = field(default_factory=list)
    n_headers: int = 0


@dataclass
class _SheetScanner:
    """State machine over the rows of one worksheet: header → lines → TOTAL, repeated."""

    source_sha256: str
    sheet_index: int
    sheet_name: str
    result: SheetExtraction = field(default_factory=SheetExtraction)
    block: int = 0
    header_row: int | None = None
    inside: bool = True
    block_has_content: bool = False

    def close_block(self, total_row: int | None, total_raw: str | None) -> None:
        self.result.blocks.append(
            {
                "source_sha256": self.source_sha256,
                "sheet_index": self.sheet_index,
                "block": self.block,
                "header_row": self.header_row,
                "total_row": total_row,
                "total_raw": total_raw,
            }
        )

    def on_header(self, excel_row: int) -> None:
        if self.result.n_headers > 0 or self.block_has_content:
            if self.inside:
                self.close_block(None, None)
            self.block += 1
        self.result.n_headers += 1
        self.header_row, self.inside, self.block_has_content = excel_row, True, False

    def on_total(self, excel_row: int, cells: Sequence[object]) -> None:
        self.close_block(excel_row, raw_text(cells[2]))
        self.inside = False

    def on_row(self, excel_row: int, cells: Sequence[object]) -> None:
        values = [raw_text(v) for v in cells[:N_LINE_COLUMNS]]
        if all(v is None or not v.strip() for v in values):
            return
        self.block_has_content = True
        self.result.lines.append(
            {
                "line_id": f"{self.source_sha256[:12]}:{self.sheet_index}:{excel_row}",
                "source_sha256": self.source_sha256,
                "sheet_index": self.sheet_index,
                "sheet_name": self.sheet_name,
                "block": self.block,
                "excel_row": excel_row,
                "row_kind": "line" if self.inside else "outside_block",
                **dict(zip(LINE_COLUMNS, values, strict=True)),
            }
        )

    def finish(self) -> SheetExtraction:
        if self.inside and (self.block_has_content or self.header_row is not None):
            self.close_block(None, None)
        return self.result


def extract_sheet(
    rows: Iterable[Sequence[object]], source_sha256: str, sheet_index: int, sheet_name: str
) -> SheetExtraction:
    """Split a worksheet into blocks (header → TOTAL) and raw lines."""
    scanner = _SheetScanner(source_sha256, sheet_index, sheet_name)
    for excel_row, row in enumerate(rows, start=1):
        cells = list(row) + [None] * max(0, N_LINE_COLUMNS - len(row))
        if is_header(cells):
            scanner.on_header(excel_row)
        elif is_total(cells):
            scanner.on_total(excel_row, cells)
        else:
            scanner.on_row(excel_row, cells)
    return scanner.finish()


def _frame(records: list[dict[str, object]], columns: Iterable[str]) -> pd.DataFrame:
    """DataFrame with the schema's columns even when there are no records."""
    return pd.DataFrame(records, columns=list(columns))


@dataclass(frozen=True)
class StagedWorkbook:
    sheets: pd.DataFrame
    blocks: pd.DataFrame
    lines: pd.DataFrame


def pseudonymise(lines: list[dict[str, object]], anonymizer: Anonymizer) -> None:
    """Replace the buyer's name (PASE) by its keyed-hash code in place (rule R208)."""
    for line in lines:
        line["customer_code"] = anonymizer.code(normalize_text(line.pop("pase_raw", None)))


def stage_workbook(path: Path, source_sha256: str, anonymizer: Anonymizer) -> StagedWorkbook:
    """Extract every worksheet of the workbook at ``path``; buyer names leave as codes."""
    workbook = openpyxl.load_workbook(path, data_only=True)
    sheets: list[dict[str, object]] = []
    blocks: list[dict[str, object]] = []
    lines: list[dict[str, object]] = []
    try:
        for index, worksheet in enumerate(workbook.worksheets):
            rows = list(worksheet.iter_rows(values_only=True))
            extraction = extract_sheet(rows, source_sha256, index, worksheet.title)
            sheets.append(
                {
                    "source_sha256": source_sha256,
                    "sheet_index": index,
                    "sheet_name": worksheet.title,
                    "hidden": worksheet.sheet_state != "visible",
                    "n_rows": len(rows),
                    "n_headers": extraction.n_headers,
                }
            )
            blocks.extend(extraction.blocks)
            lines.extend(extraction.lines)
    finally:
        workbook.close()
    pseudonymise(lines, anonymizer)
    return StagedWorkbook(
        sheets=StagedSheet.validate(pd.DataFrame(sheets)),
        blocks=StagedBlock.validate(
            pd.DataFrame(blocks, columns=list(StagedBlock.to_schema().columns))
        ),
        lines=StagedLine.validate(
            pd.DataFrame(lines, columns=list(StagedLine.to_schema().columns))
        ),
    )
