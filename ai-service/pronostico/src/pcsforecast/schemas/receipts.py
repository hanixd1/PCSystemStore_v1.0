"""Tables of the retail channel's receipts (facturas and boletas). None holds personal data."""

from __future__ import annotations

import pandas as pd
import pandera.pandas as pa
from pandera.typing import Series

DOC_KINDS = ["factura", "boleta"]
CUSTOMER_KINDS = ["person", "company", "unknown"]
CUSTOMER_BASES = ["document", "name", "none"]
RECEIPT_STATUS = ["valid", "excluded"]
CUSTOMER_CODE = r"^C[0-9a-f]{10}$"


class _Strict(pa.DataFrameModel):
    class Config:
        strict = True
        coerce = True


class StagedReceipt(_Strict):
    """One delivered receipt file as read: header fields, totals and reading problems."""

    raw_path: Series[str] = pa.Field(unique=True)
    source_sha256: Series[str] = pa.Field(str_length=64)
    folder_year: Series[pd.Int64Dtype] = pa.Field(nullable=True)
    folder_month: Series[pd.Int64Dtype] = pa.Field(nullable=True, ge=1, le=12)
    folder_kind: Series[str] = pa.Field(nullable=True)
    doc_kind: Series[str] = pa.Field(nullable=True, isin=DOC_KINDS)
    issuer_ruc: Series[str] = pa.Field(nullable=True, str_matches=r"^[0-9]{11}$")
    series: Series[str] = pa.Field(nullable=True)
    number: Series[pd.Int64Dtype] = pa.Field(nullable=True, ge=1)
    issue_date: Series[pd.Timestamp] = pa.Field(nullable=True)
    currency: Series[str] = pa.Field(nullable=True)
    payment_form: Series[str] = pa.Field(nullable=True)
    has_observation: Series[bool]
    customer_code: Series[str] = pa.Field(nullable=True, str_matches=CUSTOMER_CODE)
    customer_kind: Series[str] = pa.Field(isin=CUSTOMER_KINDS)
    customer_basis: Series[str] = pa.Field(isin=CUSTOMER_BASES)
    total_amount: Series[float] = pa.Field(nullable=True)
    igv_amount: Series[float] = pa.Field(nullable=True)
    sale_value: Series[float] = pa.Field(nullable=True)
    taxed_value: Series[float] = pa.Field(nullable=True)
    n_pages: Series[int] = pa.Field(ge=1)
    n_lines: Series[int] = pa.Field(ge=0)
    issues: Series[str]


class StagedReceiptLine(_Strict):
    """One item line of a receipt, as printed."""

    raw_path: Series[str]
    line_no: Series[int] = pa.Field(ge=1)
    quantity: Series[float]
    unit: Series[str] = pa.Field(nullable=True)
    description: Series[str] = pa.Field(nullable=True)
    unit_value: Series[float]
    discount: Series[float] = pa.Field(nullable=True)
    sale_amount: Series[float] = pa.Field(nullable=True)


class CleanRetailLine(_Strict):
    """A sold item of a valid receipt, dated by the receipt's issue date."""

    line_id: Series[str] = pa.Field(unique=True)
    receipt_key: Series[str]
    issue_date: Series[pd.Timestamp]
    doc_kind: Series[str] = pa.Field(isin=DOC_KINDS)
    customer_code: Series[str] = pa.Field(nullable=True, str_matches=CUSTOMER_CODE)
    customer_kind: Series[str] = pa.Field(isin=CUSTOMER_KINDS)
    quantity: Series[float] = pa.Field(gt=0)
    unit: Series[str] = pa.Field(nullable=True)
    description: Series[str] = pa.Field(nullable=True)
    unit_value: Series[float] = pa.Field(ge=0)
    net_amount: Series[float]
