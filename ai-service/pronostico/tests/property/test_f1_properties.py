from __future__ import annotations

from datetime import date, timedelta
from itertools import combinations

from hypothesis import given
from hypothesis import strategies as st

from pcsforecast.audit.anonymize import Anonymizer
from pcsforecast.audit.cleaning import parse_quantity
from pcsforecast.audit.sheet_dates import longest_chronological_run, parse_sheet_name
from pcsforecast.text import normalize_text

dates = st.dates(min_value=date(2024, 1, 1), max_value=date(2026, 12, 31))


@given(st.text(max_size=30))
def test_sheet_name_parser_never_fails(name: str) -> None:
    parsed = parse_sheet_name(name)
    if parsed.month is not None and parsed.day_end is None:
        assert parsed.month <= 12 or parsed.day is not None


@given(dates)
def test_canonical_names_round_trip(day: date) -> None:
    parsed = parse_sheet_name(day.strftime("%d-%m-%y"))
    assert (parsed.day, parsed.month, parsed.year) == (day.day, day.month, day.year)


@given(st.lists(dates, max_size=9))
def test_chronological_run_is_sorted_and_longest(values: list[date]) -> None:
    run = longest_chronological_run(values)
    assert run == sorted(run)
    picked = [values[i] for i in run]
    assert picked == sorted(picked)
    longest = max(
        (
            len(c)
            for r in range(len(values) + 1)
            for c in combinations(values, r)
            if list(c) == sorted(c)
        ),
        default=0,
    )
    assert len(run) == longest


@given(st.lists(dates, min_size=1, max_size=40, unique=True))
def test_sorted_dates_are_all_anchors(values: list[date]) -> None:
    ordered = sorted(values)
    assert longest_chronological_run(ordered) == list(range(len(ordered)))


@given(st.text(max_size=40))
def test_normalize_text_is_idempotent(text: str) -> None:
    once = normalize_text(text)
    assert normalize_text(once) == once
    if once is not None:
        assert once == once.strip()
        assert "  " not in once


@given(st.integers(min_value=-5, max_value=10_000))
def test_parse_quantity_accepts_only_positive_integers(value: int) -> None:
    assert parse_quantity(str(value)) == (value if value >= 1 else None)


@given(st.lists(st.text(min_size=1, max_size=20), min_size=2, max_size=30, unique=True))
def test_anonymizer_does_not_merge_customers(names: list[str]) -> None:
    anonymizer = Anonymizer(bytes(range(32)))
    codes = [anonymizer.code(n) for n in names]
    assert len(set(codes)) == len(names)


@given(dates, st.integers(min_value=0, max_value=5))
def test_range_names_are_ordered(start: date, length: int) -> None:
    end = start + timedelta(days=length)
    if end.month != start.month:
        return
    parsed = parse_sheet_name(
        f"{start.day:02d} AL {end.day:02d} {start.month:02d}-{start.year % 100:02d}"
    )
    assert (parsed.day, parsed.day_end) == (start.day, end.day)
