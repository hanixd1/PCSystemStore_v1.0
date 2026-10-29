"""Classification and correction of staged lines (rules R201-R209).

Raw values stay next to the normalised ones; every value a rule changes is written to the
correction log with its original form.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field

import pandas as pd

from pcsforecast.schemas.extraction import CleanLine, Correction
from pcsforecast.text import normalize_text

_ISO_DATE = re.compile(r"\d{4}-\d{2}-\d{2}(T[\d:]{5,8})?")
_DAY_FIRST_DATE = re.compile(r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}")


def parse_quantity(raw: str | None) -> int | None:
    """Positive whole quantity, or ``None`` if the cell is empty or not a positive integer."""
    text = normalize_text(raw)
    if text is None:
        return None
    try:
        number = float(text)
    except ValueError:
        return None
    if not number.is_integer() or number < 1:
        return None
    return int(number)


def parse_amount(raw: str | None) -> float | None:
    """Numeric amount, or ``None`` when the cell is empty or not a number."""
    text = normalize_text(raw)
    if text is None:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _text_or_none(value: object) -> str | None:
    """Text of a cell value; ``None`` for missing values (``None`` or NaN)."""
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    return str(value)


@dataclass
class CleaningResult:
    lines: pd.DataFrame
    corrections: pd.DataFrame


@dataclass
class _Log:
    rows: list[dict[str, object]] = field(default_factory=list)

    def add(self, line_id: str, field_name: str, original: object, new: object, rule: str) -> None:
        self.rows.append(
            {
                "line_id": line_id,
                "field": field_name,
                "original": _text_or_none(original),
                "corrected": _text_or_none(new),
                "rule_id": rule,
            }
        )


def _movement(code: str | None, lookup: dict[str, str], empty_movement: str) -> str:
    """Movement type of a normalised OBS code (R207)."""
    if code is None:
        return empty_movement
    return lookup.get(code, "unspecified")


def is_date_text(text: str | None) -> bool:
    """A date written where a code is expected (e.g. Excel date in OBS)."""
    if text is None:
        return False
    return any(p.fullmatch(text) for p in (_ISO_DATE, _DAY_FIRST_DATE))


def _status(
    row_kind: str, product: str | None, amount_text: str | None, movement_code: str | None
) -> str | None:
    """Exclusion rule for a staged row, or ``None`` if the row is a valid sales line."""
    if row_kind == "outside_block":
        return "R203"
    if product is None:
        return "R202" if amount_text is not None else "R201"
    if is_date_text(movement_code):
        return "R209"
    return None


def clean_lines(
    staged: pd.DataFrame,
    sheet_dates: pd.DataFrame,
    movement_lookup: dict[str, str],
    empty_movement: str = "unspecified",
) -> CleaningResult:
    """Turn StagedLine rows into CleanLine rows plus the correction log."""
    dates = sheet_dates.set_index("sheet_index")
    log = _Log()
    records: list[dict[str, object]] = []
    for row in staged.itertuples(index=False):
        line_id = str(row.line_id)
        cant_raw, monto_raw = _text_or_none(row.cant_raw), _text_or_none(row.monto_raw)
        product = normalize_text(row.producto_raw)
        amount_text = normalize_text(monto_raw)
        movement_code = normalize_text(row.obs_raw)
        exclusion = _status(str(row.row_kind), product, amount_text, movement_code)
        valid = exclusion is None

        quantity = parse_quantity(cant_raw)
        imputed = False
        if valid and quantity is None:
            quantity, imputed = 1, True
            log.add(line_id, "quantity", cant_raw, quantity, "R204")

        amount = parse_amount(monto_raw)
        if valid and amount is None and amount_text is not None:
            log.add(line_id, "amount", monto_raw, None, "R205")

        sheet = dates.loc[row.sheet_index]
        start, end, confidence = sheet["date_start"], sheet["date_end"], sheet["confidence"]

        records.append(
            {
                "line_id": line_id,
                "sheet_index": row.sheet_index,
                "sheet_name": row.sheet_name,
                "excel_row": row.excel_row,
                "date_start": start,
                "date_end": end,
                "date_confidence": confidence,
                "quantity": quantity if valid else None,
                "quantity_imputed": imputed,
                "amount": amount,
                "product_raw": row.producto_raw,
                "product_text": product,
                "customer_code": _text_or_none(row.customer_code),
                "movement_code": movement_code,
                "movement_type": _movement(movement_code, movement_lookup, empty_movement),
                "has_serial": normalize_text(row.serie_raw) is not None,
                "status": "valid" if valid else "excluded",
                "exclusion_rule": exclusion,
            }
        )
    lines = pd.DataFrame(records, columns=list(CleanLine.to_schema().columns))
    lines["quantity"] = lines["quantity"].astype("Int64")
    corrections = pd.DataFrame(log.rows, columns=list(Correction.to_schema().columns))
    return CleaningResult(CleanLine.validate(lines), Correction.validate(corrections))
