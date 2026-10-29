"""Quality audit sheet (Table 19): counts with denominators, organised by ISO/IEC 25012.

The report describes the record's structure and coverage only. It contains no customer names and
computes nothing about forecasting performance.
"""

from __future__ import annotations

from collections import Counter
from typing import Any

import pandas as pd

from pcsforecast.audit.cleaning import parse_amount
from pcsforecast.text import normalize_text

AMOUNT_TOLERANCE = 1e-6
SALE_TYPES = ("sale_paid", "sale_credit")


def reconcile_blocks(staged: pd.DataFrame, blocks: pd.DataFrame) -> pd.DataFrame:
    """Sum of line amounts of each block next to the block's written TOTAL."""
    lines = staged[staged["row_kind"] == "line"].copy()
    lines["amount"] = lines["monto_raw"].map(parse_amount)
    sums = lines.groupby(["sheet_index", "block"])["amount"].sum(min_count=1)
    result = blocks[["sheet_index", "block", "total_row", "total_raw"]].copy()
    result["total_value"] = result["total_raw"].map(parse_amount)
    result["lines_sum"] = [
        sums.get((s, b), 0.0) for s, b in zip(result["sheet_index"], result["block"], strict=True)
    ]
    result["lines_sum"] = result["lines_sum"].fillna(0.0)

    def status(row: pd.Series) -> str:
        if pd.isna(row["total_row"]):
            return "no_total_row"
        if pd.isna(row["total_value"]):
            return "total_not_numeric"
        if abs(row["lines_sum"] - row["total_value"]) <= AMOUNT_TOLERANCE:
            return "match"
        return "mismatch"

    result["status"] = result.apply(status, axis=1)
    return result


def _counts(series: pd.Series) -> dict[str, int]:
    return {str(k): int(v) for k, v in series.value_counts(dropna=False).sort_index().items()}


def _rule_counts(rules: pd.Series) -> dict[str, int]:
    counter: Counter[str] = Counter()
    for value in rules:
        counter.update(r for r in str(value).split(",") if r)
    return dict(sorted(counter.items()))


def build_audit_report(
    *,
    source: dict[str, Any],
    sheets: pd.DataFrame,
    sheet_dates: pd.DataFrame,
    staged: pd.DataFrame,
    reconciliation: pd.DataFrame,
    clean: pd.DataFrame,
    corrections: pd.DataFrame,
    movement_confirmed: dict[str, bool],
) -> dict[str, Any]:
    """Assemble the audit report as a JSON-serialisable dictionary."""
    valid = clean[clean["status"] == "valid"]
    sales = valid[valid["movement_type"].isin(SALE_TYPES)]
    month = valid["date_start"].dt.strftime("%Y-%m")
    serial_text = staged.set_index("line_id").loc[valid["line_id"], "serie_raw"].map(normalize_text)
    sale_serials = serial_text.loc[sales["line_id"]].dropna()
    duplicate_keys = ["date_start", "product_text", "quantity", "amount", "customer_code"]
    with_serial = valid.assign(serial=serial_text.to_numpy()).dropna(subset=["serial"])
    exact_duplicates = with_serial.duplicated([*duplicate_keys, "serial"], keep=False)
    unmapped = valid.loc[valid["movement_type"] == "unspecified", "movement_code"]

    return {
        "source": source,
        "completeness": {
            "sheets_total": len(sheets),
            "sheets_hidden": int(sheets["hidden"].sum()),
            "sheets_with_valid_lines": int(valid["sheet_index"].nunique()),
            "staged_rows": len(staged),
            "rows_by_status": _counts(clean["status"]),
            "excluded_by_rule": _counts(clean["exclusion_rule"].dropna()),
            "valid_lines": len(valid),
            "valid_units": int(valid["quantity"].sum()),
            "valid_lines_without_amount": int(valid["amount"].isna().sum()),
        },
        "accuracy": {
            "corrections_by_rule": _counts(corrections["rule_id"]),
            "quantity_imputed": int(valid["quantity_imputed"].sum()),
            "non_positive_amounts": int((valid["amount"] <= 0).sum()),
        },
        "consistency": {
            "blocks_total": len(reconciliation),
            "reconciliation": _counts(reconciliation["status"]),
            "mismatches": reconciliation.loc[
                reconciliation["status"] == "mismatch",
                ["sheet_index", "block", "lines_sum", "total_value"],
            ].to_dict(orient="records"),
            "possible_duplicate_lines": int(exact_duplicates.sum()),
            "serials_in_more_than_one_sale": int((sale_serials.value_counts() > 1).sum()),
        },
        "credibility": {
            "valid_lines_by_movement": _counts(valid["movement_type"]),
            "valid_units_by_movement": {
                str(k): int(v) for k, v in valid.groupby("movement_type")["quantity"].sum().items()
            },
            "movement_types_confirmed": movement_confirmed,
            "unmapped_codes": _counts(unmapped.fillna("<empty>")),
        },
        "currentness": {
            "sheet_date_confidence": _counts(sheet_dates["confidence"]),
            "sheet_date_rules": _rule_counts(sheet_dates["rules"]),
            "valid_lines_by_date_confidence": _counts(valid["date_confidence"]),
            "first_date": str(valid["date_start"].min().date()),
            "last_date": str(valid["date_end"].max().date()),
            "valid_lines_by_month": _counts(month),
            "valid_units_by_month": {
                str(k): int(v) for k, v in valid.groupby(month)["quantity"].sum().items()
            },
            "low_confidence_sheets": sheet_dates.loc[
                sheet_dates["confidence"] == "low", "sheet_name"
            ].tolist(),
        },
        "traceability": {
            "every_line_has_sheet_and_row": bool(
                clean[["sheet_index", "excel_row"]].notna().all().all()
            ),
        },
        "confidentiality": {
            "distinct_customer_codes": int(valid["customer_code"].nunique()),
            "valid_lines_without_customer": int(valid["customer_code"].isna().sum()),
        },
        "catalog_preview": {
            "distinct_product_texts": int(valid["product_text"].nunique()),
        },
    }


def render_markdown(report: dict[str, Any], title: str = "vecinos sales record") -> str:
    """Human-readable version of the audit report."""
    lines = [f"# Quality audit — {title}", ""]
    source = report.get("source")
    if source is not None:
        lines += [f"- Source: `{source['file']}`", f"- SHA-256: `{source['sha256']}`", ""]
    for section, values in report.items():
        if section == "source":
            continue
        lines += [f"## {section.replace('_', ' ').capitalize()}", ""]
        for key, value in values.items():
            label = key.replace("_", " ")
            if isinstance(value, dict) and value:
                lines.append(f"- **{label}**:")
                lines += [f"  - {k}: {v}" for k, v in value.items()]
            elif isinstance(value, list):
                lines.append(f"- **{label}** ({len(value)}): {', '.join(map(str, value)) or '—'}")
            else:
                lines.append(f"- **{label}**: {value}")
        lines.append("")
    return "\n".join(lines)
