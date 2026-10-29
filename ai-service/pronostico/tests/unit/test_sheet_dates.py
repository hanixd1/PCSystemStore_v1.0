from __future__ import annotations

from datetime import date

import pandas as pd
import pytest

from pcsforecast.audit.sheet_dates import (
    longest_chronological_run,
    parse_sheet_name,
    resolve_sheet_dates,
)
from pcsforecast.config import SheetDateOverride


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("03-01-24", (3, 1, 2024, None, False, ("R101",))),
        ("  05-02-24  ", (5, 2, 2024, None, False, ("R101",))),
        ("18-08-2026", (18, 8, 2026, None, False, ("R101",))),
        ("02-07-24 (2)", (2, 7, 2024, None, True, ("R101",))),
        ("06-04-24-", (6, 4, 2024, None, False, ("R101",))),
        ("22-10-24)", (22, 10, 2024, None, False, ("R101",))),
        ("16-01", (16, 1, None, None, False, ("R101",))),
        ("10-12-2", (10, 12, None, None, False, ("R101",))),
        ("12-10-244", (12, 10, None, None, False, ("R101",))),
        ("03-25-24", (25, 3, 2024, None, False, ("R101", "R104"))),
        ("12 AL 15 08-26", (12, 8, 2026, 15, False, ("R101", "R102"))),
        ("18-19-07-25", (18, 7, 2025, 19, False, ("R101", "R102"))),
        ("Hoja19", (None, None, None, None, False, ("R101",))),
    ],
)
def test_parse_sheet_name(name: str, expected: tuple[object, ...]) -> None:
    parsed = parse_sheet_name(name)
    got = (parsed.day, parsed.month, parsed.year, parsed.day_end, parsed.is_copy, parsed.rules)
    assert got == expected


def test_swapped_name_keeps_the_written_day() -> None:
    assert parse_sheet_name("03-25-24").written_day == 3


def test_longest_chronological_run_skips_out_of_order_values() -> None:
    values = [date(2024, 1, d) for d in (3, 4, 30, 5, 6)]
    assert longest_chronological_run(values) == [0, 1, 3, 4]
    assert longest_chronological_run([]) == []


def _sheets(names: list[str]) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "source_sha256": ["0" * 64] * len(names),
            "sheet_index": range(len(names)),
            "sheet_name": names,
            "hidden": [False] * len(names),
            "n_rows": [10] * len(names),
            "n_headers": [1] * len(names),
        }
    )


def _resolve(
    names: list[str], without_lines: frozenset[int] = frozenset(), **kwargs: object
) -> pd.DataFrame:
    with_lines = set(range(len(names))) - set(without_lines)
    return resolve_sheet_dates(_sheets(names), with_lines, **kwargs).set_index("sheet_name")  # type: ignore[arg-type]


def _day(frame: pd.DataFrame, name: str) -> tuple[object, object, object, object]:
    row = frame.loc[name]
    start = row["date_start"].date() if pd.notna(row["date_start"]) else None
    end = row["date_end"].date() if pd.notna(row["date_end"]) else None
    return start, end, row["confidence"], row["rules"]


def test_anchors_are_high_confidence() -> None:
    frame = _resolve(["03-01-24", "04-01-24", "05-01-24"])
    assert frame["is_anchor"].all()
    assert _day(frame, "04-01-24") == (date(2024, 1, 4), date(2024, 1, 4), "high", "R101,R105")


def test_missing_year_is_completed_from_anchors() -> None:
    frame = _resolve(["15-01-24", "16-01", "17-01-24"])
    assert _day(frame, "16-01") == (
        date(2024, 1, 16),
        date(2024, 1, 16),
        "medium",
        "R101,R103,R105",
    )


def test_missing_year_across_new_year() -> None:
    frame = _resolve(["30-12-24", "02-01", "03-01-25"])
    assert _day(frame, "02-01")[0] == date(2025, 1, 2)


def test_colliding_typo_is_repaired_with_neighbour_month() -> None:
    frame = _resolve(["11-01-24", "12-10-24", "13-01-24", "11-10-24", "12-10-244", "13-10-24"])
    assert _day(frame, "12-10-24") == (date(2024, 1, 12), date(2024, 1, 12), "medium", "R101,R106")
    assert _day(frame, "12-10-244")[0] == date(2024, 10, 12)


def test_swapped_typo_out_of_place_uses_the_written_day() -> None:
    frame = _resolve(["25-03-24", "02-05-24", "03-25-24", "04-05-24"])
    assert _day(frame, "03-25-24") == (
        date(2024, 5, 3),
        date(2024, 5, 3),
        "medium",
        "R101,R104,R106",
    )


def test_unrepairable_collision_gets_the_anchor_interval() -> None:
    frame = _resolve(["19-02-24", "20-02-24", "21-02-24", "05-03-24", "20-02-24 ", "07-03-24"])
    assert _day(frame, "20-02-24 ") == (date(2024, 3, 5), date(2024, 3, 7), "low", "R101,R106")


def test_moved_tab_without_collision_keeps_its_name() -> None:
    frame = _resolve(["04-03-24", "13-03-24", "05-03-24", "06-03-24"])
    assert _day(frame, "13-03-24") == (date(2024, 3, 13), date(2024, 3, 13), "medium", "R101,R107")


def test_copies_are_the_following_days() -> None:
    frame = _resolve(["13-05-26", "13-05-26 (2)", "13-05-26 (3)", "20-07-26"])
    assert _day(frame, "13-05-26 (2)") == (
        date(2026, 5, 14),
        date(2026, 5, 14),
        "medium",
        "R101,R108",
    )
    assert _day(frame, "13-05-26 (3)")[0] == date(2026, 5, 15)
    assert not frame.loc["13-05-26 (2)", "is_anchor"]


def test_copy_joins_its_original_when_the_next_day_has_a_sheet() -> None:
    frame = _resolve(["02-07-24", "02-07-24 (2)", "03-07-24"])
    assert _day(frame, "02-07-24 (2)")[:3] == (date(2024, 7, 2), date(2024, 7, 2), "medium")


def test_copy_number_is_parsed() -> None:
    assert parse_sheet_name("13-05-26 (5)").copy_number == 5
    assert parse_sheet_name("13-05-26").copy_number is None


def test_ranges() -> None:
    frame = _resolve(["08-08-26", "12 AL 15 08-26", "18-08-2026"])
    assert _day(frame, "12 AL 15 08-26") == (
        date(2026, 8, 12),
        date(2026, 8, 15),
        "medium",
        "R101,R102",
    )


def test_inverted_range_falls_back_to_interval() -> None:
    frame = _resolve(["08-08-26", "15 AL 12 08-26", "18-08-2026"])
    assert _day(frame, "15 AL 12 08-26") == (
        date(2026, 8, 8),
        date(2026, 8, 18),
        "low",
        "R101,R102,R105",
    )


def test_undated_sheets() -> None:
    frame = _resolve(["29-11-24", "Hoja2", "31-11-2", "02-12-24"], without_lines=frozenset({1}))
    assert _day(frame, "Hoja2") == (None, None, "none", "R101,R111")
    assert _day(frame, "31-11-2") == (
        date(2024, 11, 29),
        date(2024, 12, 2),
        "low",
        "R101,R103,R105",
    )


def test_override_wins() -> None:
    override = SheetDateOverride(
        sheet_name="13-04-26 (2)",
        date_start=date(2026, 4, 14),
        date_end=date(2026, 4, 18),
        reason="confirmed",
        confirmed_by="manager",
    )
    frame = _resolve(["13-04-26", "13-04-26 (2)", "13-05-26"], overrides=[override])
    assert _day(frame, "13-04-26 (2)") == (
        date(2026, 4, 14),
        date(2026, 4, 18),
        "confirmed",
        "R110",
    )
