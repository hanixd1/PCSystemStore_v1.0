"""Plain Markdown tables for the reports written to the repository (no extra dependency)."""

from __future__ import annotations

import pandas as pd

EXACT_INTEGERS = 2.0**53  # floats below this hold integers exactly


def _cell(value: object, digits: int) -> str:
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, float):
        if value.is_integer() and abs(value) < EXACT_INTEGERS:
            return str(int(value))  # counts stored as floats (mixed columns)
        if value != 0 and abs(value) < 10.0**-digits:
            return f"{value:.{digits}g}"  # small p-values keep their magnitude
        return f"{value:.{digits}f}"
    return str(value).replace("|", "\\|")


def markdown_table(frame: pd.DataFrame, digits: int = 3) -> str:
    """``frame`` as a GitHub Markdown table; floats with ``digits`` decimals (very small ones
    in scientific notation), booleans yes/no."""
    header = "| " + " | ".join(str(c) for c in frame.columns) + " |"
    rule = "|" + "|".join("---" for _ in frame.columns) + "|"
    rows = [
        "| " + " | ".join(_cell(v, digits) for v in row) + " |"
        for row in frame.itertuples(index=False, name=None)
    ]
    return "\n".join([header, rule, *rows])
