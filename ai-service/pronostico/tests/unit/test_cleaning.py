from __future__ import annotations

import math

import pandas as pd
import pytest

from pcsforecast.audit.cleaning import clean_lines, is_date_text, parse_amount, parse_quantity
from pcsforecast.text import normalize_text

LOOKUP = {"PAGO": "sale_paid", "DEV": "return", "REEMP GARANTIA": "warranty"}


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (None, None),
        (math.nan, None),
        ("   ", None),
        ("  ssd\xa0 1tb  sata ", "SSD 1TB SATA"),
        ("REEMP  GARANTIA", "REEMP GARANTIA"),
        (215, "215"),
    ],
)
def test_normalize_text(raw: object, expected: str | None) -> None:
    assert normalize_text(raw) == expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("2", 2),
        (" 3 ", 3),
        ("2.0", 2),
        ("0", None),
        ("-1", None),
        ("1.5", None),
        ("x", None),
        (None, None),
    ],
)
def test_parse_quantity(raw: str | None, expected: int | None) -> None:
    assert parse_quantity(raw) == expected


@pytest.mark.parametrize(
    ("raw", "expected"), [("215", 215.0), ("12.5", 12.5), (".", None), ("  ", None), (None, None)]
)
def test_parse_amount(raw: str | None, expected: float | None) -> None:
    assert parse_amount(raw) == expected


def _staged(rows: list[dict[str, object]]) -> pd.DataFrame:
    base = {
        "source_sha256": "a" * 64,
        "sheet_index": 0,
        "sheet_name": "03-01-24",
        "block": 0,
        "row_kind": "line",
        "cant_raw": None,
        "producto_raw": None,
        "monto_raw": None,
        "customer_code": None,
        "serie_raw": None,
        "obs_raw": None,
    }
    records = [
        {**base, "line_id": f"L{i}", "excel_row": i + 2, **row} for i, row in enumerate(rows)
    ]
    return pd.DataFrame(records)


def _dates() -> pd.DataFrame:
    day = pd.Timestamp("2024-01-03")
    return pd.DataFrame(
        {
            "sheet_index": [0],
            "sheet_name": ["03-01-24"],
            "name_date": [day],
            "is_copy": [False],
            "is_anchor": [True],
            "date_start": [day],
            "date_end": [day],
            "confidence": ["high"],
            "rules": ["R101,R105"],
        }
    )


def test_classification_and_corrections() -> None:
    staged = _staged(
        [
            {
                "cant_raw": "1",
                "producto_raw": " ssd 1tb ",
                "monto_raw": "215",
                "customer_code": "C0123456789",
                "serie_raw": "SN1",
                "obs_raw": "pago",
            },
            {"cant_raw": "1"},
            {"monto_raw": "50"},
            {
                "cant_raw": "1",
                "producto_raw": "RAM",
                "monto_raw": "75",
                "row_kind": "outside_block",
            },
            {"producto_raw": "CPU", "monto_raw": ".", "obs_raw": "REEMP  GARANTIA"},
            {"cant_raw": "2", "producto_raw": "PSU", "obs_raw": "DEV"},
            {"cant_raw": "1", "producto_raw": "FAN", "obs_raw": "zz"},
        ]
    )
    result = clean_lines(staged, _dates(), LOOKUP)
    lines = result.lines.set_index("line_id")

    assert lines.loc["L0", "status"] == "valid"
    assert lines.loc["L0", "product_text"] == "SSD 1TB"
    assert lines.loc["L0", "product_raw"] == " ssd 1tb "
    assert lines.loc["L0", "movement_type"] == "sale_paid"
    assert lines.loc["L0", "customer_code"] == "C0123456789"
    assert lines.loc["L0", "has_serial"]
    assert list(lines["exclusion_rule"].iloc[1:4]) == ["R201", "R202", "R203"]
    assert pd.isna(lines.loc["L1", "quantity"])

    assert lines.loc["L4", "quantity"] == 1
    assert lines.loc["L4", "quantity_imputed"]
    assert pd.isna(lines.loc["L4", "amount"])
    assert lines.loc["L4", "movement_type"] == "warranty"

    assert lines.loc["L5", "date_start"] == pd.Timestamp("2024-01-03")
    assert lines.loc["L5", "date_confidence"] == "high"
    assert lines.loc["L5", "movement_type"] == "return"
    assert lines.loc["L6", "movement_type"] == "unspecified"

    log = result.corrections.set_index(["line_id", "field"])
    assert log.loc[("L4", "quantity"), "rule_id"] == "R204"
    assert pd.isna(log.loc[("L4", "quantity"), "original"])
    assert log.loc[("L4", "amount"), "original"] == "."
    assert len(result.corrections) == 2


def test_empty_obs_takes_the_configured_movement() -> None:
    staged = _staged(
        [
            {"cant_raw": "1", "producto_raw": "SSD", "obs_raw": None},
            {"cant_raw": "1", "producto_raw": "SSD", "obs_raw": "   "},
        ]
    )
    lines = clean_lines(staged, _dates(), LOOKUP, "not_sold").lines
    assert lines["movement_type"].tolist() == ["not_sold", "not_sold"]


@pytest.mark.parametrize("obs", ["2024-04-26T00:00:00", "2024-04-26", "26/04/2024", "26-04-24"])
def test_a_date_in_obs_excludes_the_line(obs: str) -> None:
    staged = _staged([{"cant_raw": "1", "producto_raw": "SSD", "monto_raw": "90", "obs_raw": obs}])
    lines = clean_lines(staged, _dates(), LOOKUP).lines
    assert lines.loc[0, "status"] == "excluded"
    assert lines.loc[0, "exclusion_rule"] == "R209"
    assert pd.isna(lines.loc[0, "quantity"])


@pytest.mark.parametrize(
    ("text", "expected"), [("PAGO", False), (None, False), ("2026-05-11", True)]
)
def test_is_date_text(text: str | None, expected: bool) -> None:
    assert is_date_text(text) is expected
