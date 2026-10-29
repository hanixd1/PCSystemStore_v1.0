"""Audit and cleaning of the staged retail receipts (rules R301-R307).

Every decision is logged: folder mismatches (R301, R302) in the correction log, repeated and
non-reconciling receipts (R303, R304) as exclusions, numbering gaps (R307) as completeness.
"""

from __future__ import annotations

from collections.abc import Hashable, Mapping
from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd

from pcsforecast.schemas.extraction import Correction
from pcsforecast.schemas.receipts import CleanRetailLine

FOLDER_KINDS = {
    "BOLETA": "boleta",
    "BOLETAS": "boleta",
    "FACTURA": "factura",
    "FACTURAS": "factura",
}
RECONCILE_TOLERANCE = 0.05


@dataclass(frozen=True)
class ReceiptAudit:
    receipts: pd.DataFrame  # every staged receipt with receipt_key, status and reason
    lines: pd.DataFrame  # CleanRetailLine
    corrections: pd.DataFrame  # Correction
    gaps: pd.DataFrame  # one row per gap in a series' numbering


def receipt_key(receipts: pd.DataFrame) -> pd.Series:
    """``issuer-series-number``, the receipt's identity (rule R303)."""
    return (
        receipts["issuer_ruc"].astype("string")
        + "-"
        + receipts["series"].astype("string")
        + "-"
        + receipts["number"].astype("string")
    )


def folder_corrections(receipts: pd.DataFrame) -> pd.DataFrame:
    """Folder month and kind that differ from the printed ones (rules R301, R302)."""
    rows: list[dict[str, Any]] = []
    for row in receipts.to_dict("records"):
        raw_path = str(row["raw_path"])
        if pd.notna(row["issue_date"]):
            issued, filed = f"{row['issue_date']:%Y-%m}", _filed_month(row)
            if filed != issued:
                rows.append(_correction(raw_path, "month", filed, issued, "R301"))
        filed_kind = FOLDER_KINDS.get(str(row["folder_kind"]))
        if filed_kind is not None and pd.notna(row["doc_kind"]) and filed_kind != row["doc_kind"]:
            rows.append(_correction(raw_path, "doc_kind", filed_kind, str(row["doc_kind"]), "R302"))
    return Correction.validate(pd.DataFrame(rows, columns=list(Correction.to_schema().columns)))


def _filed_month(row: Mapping[Hashable, Any]) -> str | None:
    if pd.isna(row["folder_year"]) or pd.isna(row["folder_month"]):
        return None
    return f"{int(row['folder_year'])}-{int(row['folder_month']):02d}"


def _correction(
    raw_path: str, field: str, original: str | None, corrected: str, rule: str
) -> dict[str, Any]:
    return {
        "line_id": raw_path,
        "field": field,
        "original": original,
        "corrected": corrected,
        "rule_id": rule,
    }


def reconciliation_gap(receipts: pd.DataFrame, lines: pd.DataFrame) -> pd.Series:
    """Item total minus printed total, per receipt (rule R304); NaN when nothing to compare."""
    items = lines.assign(net=lines["quantity"] * lines["unit_value"]).groupby("raw_path")
    item_sums = pd.DataFrame({"net": items["net"].sum(), "sale": items["sale_amount"].sum()})
    joined = receipts.join(item_sums, on="raw_path")
    factura = joined["net"] - joined["sale_value"]
    boleta = joined["sale"] - joined["total_amount"]
    gap = factura.where(joined["doc_kind"] == "factura", boleta)
    return gap.where(joined["doc_kind"].notna())


def classify_receipts(receipts: pd.DataFrame, lines: pd.DataFrame) -> pd.DataFrame:
    """Status ``valid`` or ``excluded`` with the reason, for every staged receipt."""
    result = receipts.copy()
    result["receipt_key"] = receipt_key(result)
    result["reconciliation_gap"] = reconciliation_gap(result, lines).to_numpy()
    reason = pd.Series(pd.NA, index=result.index, dtype="string")
    unreadable = (result["issues"] != "") | result["receipt_key"].isna()
    reason[unreadable] = "unreadable"
    off = ~(result["reconciliation_gap"].abs() <= RECONCILE_TOLERANCE)
    reason[reason.isna() & off] = "does_not_reconcile"
    ordered = result.sort_values("raw_path")
    repeated = ordered["receipt_key"].duplicated() & ordered["receipt_key"].notna()
    reason[reason.isna() & repeated.reindex(result.index)] = "repeated"
    result["status"] = np.where(reason.isna(), "valid", "excluded")
    result["exclusion_reason"] = reason
    return result


def clean_retail_lines(classified: pd.DataFrame, lines: pd.DataFrame) -> pd.DataFrame:
    """Item lines of valid receipts, dated by issue date (rule R301)."""
    valid = classified.loc[classified["status"] == "valid"]
    header = valid[
        ["raw_path", "receipt_key", "issue_date", "doc_kind", "customer_code", "customer_kind"]
    ]
    merged = lines.merge(header, on="raw_path", how="inner")
    merged["line_id"] = merged["receipt_key"] + ":" + merged["line_no"].astype(str)
    merged["net_amount"] = merged["quantity"] * merged["unit_value"]
    columns = list(CleanRetailLine.to_schema().columns)
    return CleanRetailLine.validate(merged.sort_values(["issue_date", "line_id"])[columns])


def numbering_gaps(classified: pd.DataFrame) -> pd.DataFrame:
    """Missing numbers between consecutive delivered receipts of each series (rule R307).

    A gap is placed in a month when the receipts on both sides were issued in that month;
    otherwise it spans two months and ``month`` is empty.
    """
    present = classified.dropna(subset=["receipt_key"]).drop_duplicates("receipt_key")
    rows: list[dict[str, Any]] = []
    for (issuer, series), group in present.groupby(["issuer_ruc", "series"]):
        ordered = group.sort_values("number")
        numbers = ordered["number"].to_numpy(dtype=int)
        months = ordered["issue_date"].dt.to_period("M").to_numpy()
        kinds = ordered["doc_kind"].to_numpy()
        for i in np.flatnonzero(np.diff(numbers) > 1):
            same = months[i] == months[i + 1]
            rows.append(
                {
                    "issuer_ruc": issuer,
                    "series": series,
                    "doc_kind": kinds[i],
                    "after_number": int(numbers[i]),
                    "before_number": int(numbers[i + 1]),
                    "missing": int(numbers[i + 1] - numbers[i] - 1),
                    "month": str(months[i]) if same else None,
                }
            )
    columns = [
        "issuer_ruc",
        "series",
        "doc_kind",
        "after_number",
        "before_number",
        "missing",
        "month",
    ]
    return pd.DataFrame(rows, columns=columns)


def coverage_by_month(classified: pd.DataFrame, gaps: pd.DataFrame) -> pd.DataFrame:
    """Delivered receipts and numbering gaps per month and kind."""
    delivered = (
        classified.dropna(subset=["receipt_key"])
        .drop_duplicates("receipt_key")
        .assign(month=lambda f: f["issue_date"].dt.to_period("M").astype(str))
        .groupby(["month", "doc_kind"])
        .size()
        .rename("delivered")
    )
    missing = gaps.dropna(subset=["month"]).groupby(["month", "doc_kind"])["missing"].sum()
    table = pd.concat([delivered, missing.rename("missing_within_month")], axis=1)
    table = table.fillna(0).astype(int).reset_index()
    issued = table["delivered"] + table["missing_within_month"]
    table["delivered_share"] = table["delivered"] / issued
    return table.sort_values(["month", "doc_kind"]).reset_index(drop=True)


def audit_receipts(receipts: pd.DataFrame, lines: pd.DataFrame) -> ReceiptAudit:
    classified = classify_receipts(receipts, lines)
    return ReceiptAudit(
        receipts=classified,
        lines=clean_retail_lines(classified, lines),
        corrections=folder_corrections(receipts),
        gaps=numbering_gaps(classified),
    )


def issuer_labels(receipts: pd.DataFrame) -> dict[str, str]:
    """``1``, ``2``… by first issue date, with the period each issuer RUC was used."""
    spans = receipts.groupby("issuer_ruc")["issue_date"].agg(["min", "max"]).sort_values("min")
    return {
        str(ruc): f"{rank} ({span['min']:%Y-%m} to {span['max']:%Y-%m})"
        for rank, (ruc, span) in enumerate(spans.iterrows(), start=1)
    }


def missing_by_series(gaps: pd.DataFrame, issuers: dict[str, str]) -> dict[str, int]:
    totals = gaps.groupby(["issuer_ruc", "series", "doc_kind"])["missing"].sum().reset_index()
    return {
        f"{row['doc_kind']} {row['series']}, issuer {issuers.get(str(row['issuer_ruc']))}": int(
            row["missing"]
        )
        for row in totals.to_dict("records")
    }


def build_receipt_report(audit: ReceiptAudit, coverage: pd.DataFrame) -> dict[str, Any]:
    """Counts only: the report never lists customers."""
    receipts, lines, gaps = audit.receipts, audit.lines, audit.gaps
    valid = receipts.loc[receipts["status"] == "valid"]
    issuers = issuer_labels(valid)
    return {
        "completeness": {
            "receipt_files": len(receipts),
            "valid_receipts": len(valid),
            "excluded_by_reason": receipts["exclusion_reason"].value_counts().to_dict(),
            "valid_by_kind": valid["doc_kind"].value_counts().to_dict(),
            "item_lines": len(lines),
            "units": float(lines["quantity"].sum()),
            "first_issue_date": str(valid["issue_date"].min().date()),
            "last_issue_date": str(valid["issue_date"].max().date()),
        },
        "consistency": {
            "receipts_reconciled_within_tolerance": int(
                (receipts["reconciliation_gap"].abs() <= RECONCILE_TOLERANCE).sum()
            ),
            "max_abs_reconciliation_gap": float(receipts["reconciliation_gap"].abs().max()),
            "tolerance": RECONCILE_TOLERANCE,
        },
        "numbering": {
            "missing_numbers_by_series": missing_by_series(gaps, issuers),
            "delivered_share_overall": float(
                coverage["delivered"].sum()
                / (coverage["delivered"].sum() + coverage["missing_within_month"].sum())
            ),
            "gaps_spanning_two_months": int(gaps["month"].isna().sum()),
        },
        "traceability": {
            "corrections_by_rule": audit.corrections["rule_id"].value_counts().to_dict(),
        },
        "confidentiality": {
            "customers_coded": int(valid["customer_code"].nunique()),
            "customer_basis": valid["customer_basis"].value_counts().to_dict(),
            "customer_kind": valid["customer_kind"].value_counts().to_dict(),
            "addresses_read": 0,
        },
    }
