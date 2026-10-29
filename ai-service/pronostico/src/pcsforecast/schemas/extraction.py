"""Transactional extraction sheet (Table 19, Annex 03) and the audit tables built from it."""

from __future__ import annotations

import pandas as pd
import pandera.pandas as pa
from pandera.typing import Series

ROW_KINDS = ["line", "outside_block"]
DATE_CONFIDENCE = ["confirmed", "high", "medium", "low", "none"]
LINE_STATUS = ["valid", "excluded"]
MOVEMENT_TYPES = [
    "sale_paid",
    "sale_credit",
    "return",
    "warranty",
    "damaged",
    "not_sold",
    "unknown",
    "unspecified",
]


class _Strict(pa.DataFrameModel):
    class Config:
        strict = True
        coerce = True


class StagedSheet(_Strict):
    """One worksheet of a raw workbook."""

    source_sha256: Series[str] = pa.Field(str_length=64)
    sheet_index: Series[int] = pa.Field(ge=0)
    sheet_name: Series[str]
    hidden: Series[bool]
    n_rows: Series[int] = pa.Field(ge=0)
    n_headers: Series[int] = pa.Field(ge=0)


class StagedBlock(_Strict):
    """A sales block: rows between a header and its TOTAL row."""

    source_sha256: Series[str] = pa.Field(str_length=64)
    sheet_index: Series[int] = pa.Field(ge=0)
    block: Series[int] = pa.Field(ge=0)
    header_row: Series[pd.Int64Dtype] = pa.Field(nullable=True, ge=1)
    total_row: Series[pd.Int64Dtype] = pa.Field(nullable=True, ge=1)
    total_raw: Series[str] = pa.Field(nullable=True)


class StagedLine(_Strict):
    """Raw cell values of one non-empty row of columns A-F, with its provenance."""

    line_id: Series[str] = pa.Field(unique=True)
    source_sha256: Series[str] = pa.Field(str_length=64)
    sheet_index: Series[int] = pa.Field(ge=0)
    sheet_name: Series[str]
    block: Series[int] = pa.Field(ge=0)
    excel_row: Series[int] = pa.Field(ge=1)
    row_kind: Series[str] = pa.Field(isin=ROW_KINDS)
    cant_raw: Series[str] = pa.Field(nullable=True)
    producto_raw: Series[str] = pa.Field(nullable=True)
    monto_raw: Series[str] = pa.Field(nullable=True)
    customer_code: Series[str] = pa.Field(nullable=True, str_matches=r"^C[0-9a-f]{10}$")
    serie_raw: Series[str] = pa.Field(nullable=True)
    obs_raw: Series[str] = pa.Field(nullable=True)


class SheetDate(_Strict):
    """Resolved calendar position of each worksheet (rules R101-R111)."""

    sheet_index: Series[int] = pa.Field(ge=0, unique=True)
    sheet_name: Series[str]
    name_date: Series[pd.Timestamp] = pa.Field(nullable=True)
    is_copy: Series[bool]
    is_anchor: Series[bool]
    date_start: Series[pd.Timestamp] = pa.Field(nullable=True)
    date_end: Series[pd.Timestamp] = pa.Field(nullable=True)
    confidence: Series[str] = pa.Field(isin=DATE_CONFIDENCE)
    rules: Series[str]

    @pa.dataframe_check
    @classmethod
    def ordered_range(cls, df: pd.DataFrame) -> pd.Series[bool]:
        both = df["date_start"].notna() & df["date_end"].notna()
        return ~both | (df["date_start"] <= df["date_end"])


class CleanLine(_Strict):
    """An audited line: raw values kept, normalised values added, status and rule recorded."""

    line_id: Series[str] = pa.Field(unique=True)
    sheet_index: Series[int] = pa.Field(ge=0)
    sheet_name: Series[str]
    excel_row: Series[int] = pa.Field(ge=1)
    date_start: Series[pd.Timestamp] = pa.Field(nullable=True)
    date_end: Series[pd.Timestamp] = pa.Field(nullable=True)
    date_confidence: Series[str] = pa.Field(isin=DATE_CONFIDENCE)
    quantity: Series[pd.Int64Dtype] = pa.Field(nullable=True, ge=1)
    quantity_imputed: Series[bool]
    amount: Series[float] = pa.Field(nullable=True)
    product_raw: Series[str] = pa.Field(nullable=True)
    product_text: Series[str] = pa.Field(nullable=True)
    customer_code: Series[str] = pa.Field(nullable=True)
    movement_code: Series[str] = pa.Field(nullable=True)
    movement_type: Series[str] = pa.Field(isin=MOVEMENT_TYPES)
    has_serial: Series[bool]
    status: Series[str] = pa.Field(isin=LINE_STATUS)
    exclusion_rule: Series[str] = pa.Field(nullable=True)

    @pa.dataframe_check
    @classmethod
    def valid_lines_are_complete(cls, df: pd.DataFrame) -> pd.Series[bool]:
        valid = df["status"] == "valid"
        complete = df["quantity"].notna() & df["product_text"].notna()
        return ~valid | complete

    @pa.dataframe_check
    @classmethod
    def excluded_lines_name_a_rule(cls, df: pd.DataFrame) -> pd.Series[bool]:
        return (df["status"] == "valid") | df["exclusion_rule"].notna()


class Correction(_Strict):
    """Correction log: every value changed by a rule, with the original kept."""

    line_id: Series[str]
    field: Series[str]
    original: Series[str] = pa.Field(nullable=True)
    corrected: Series[str] = pa.Field(nullable=True)
    rule_id: Series[str] = pa.Field(str_matches=r"^R\d{3}$")
