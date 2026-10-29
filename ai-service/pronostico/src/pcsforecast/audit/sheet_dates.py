"""Calendar position of each daily worksheet (rules R101-R111 in configs/data_rules.yaml).

Worksheet names are the only date of most sales lines and they contain typing errors, copies and
missing years. Dates are resolved by explicit rules and every sheet records which rules were
applied and how confident the result is; unresolvable sheets get an interval, never a guess.
"""

from __future__ import annotations

import re
from bisect import bisect_right
from collections.abc import Callable, Collection, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import date, timedelta

import pandas as pd

from pcsforecast.config import SheetDateOverride
from pcsforecast.schemas.extraction import SheetDate

_COPY_SUFFIX = re.compile(r"\((\d+)\)\s*$")
_RANGE_AL = re.compile(r"(\d{1,2})\s*AL\s*(\d{1,2})\s+(\d{1,2})-(\d+)", re.IGNORECASE)
_RANGE_DASH = re.compile(r"(\d{1,2})-(\d{1,2})-(\d{1,2})-(\d+)")
_FULL = re.compile(r"(\d{1,2})-(\d{1,2})-(\d+)")
_PARTIAL = re.compile(r"(\d{1,2})-(\d{1,2})")


@dataclass(frozen=True)
class ParsedName:
    """Day, month and (if readable) year written in a worksheet name."""

    day: int | None = None
    month: int | None = None
    year: int | None = None
    day_end: int | None = None
    is_copy: bool = False
    rules: tuple[str, ...] = ()
    written_day: int | None = None
    copy_number: int | None = None


def _year(token: str) -> int | None:
    if len(token) == 2:  # noqa: PLR2004 - two-digit year
        return 2000 + int(token)
    if len(token) == 4:  # noqa: PLR2004 - four-digit year
        return int(token)
    return None


def parse_sheet_name(name: str) -> ParsedName:
    """Read day, month, year and copy suffix from a worksheet name (R101, R102, R104)."""
    text = name.replace("\xa0", " ").strip()
    copy_match = _COPY_SUFFIX.search(text)
    is_copy = copy_match is not None
    copy_number = int(copy_match.group(1)) if copy_match else None
    text = _COPY_SUFFIX.sub("", text).strip().rstrip("-.)( ").strip()
    rules: list[str] = ["R101"]
    day_end: int | None = None
    if match := _RANGE_AL.fullmatch(text) or _RANGE_DASH.fullmatch(text):
        day, day_end, month = (int(g) for g in match.groups()[:3])
        year = _year(match.group(4))
        rules.append("R102")
    elif match := _FULL.fullmatch(text):
        day, month = int(match.group(1)), int(match.group(2))
        year = _year(match.group(3))
    elif match := _PARTIAL.fullmatch(text):
        day, month, year = int(match.group(1)), int(match.group(2)), None
    else:
        return ParsedName(is_copy=is_copy, rules=tuple(rules), copy_number=copy_number)
    written_day = day
    if month > 12 >= day and day_end is None:  # noqa: PLR2004 - months in a year
        day, month = month, day
        rules.append("R104")
    return ParsedName(day, month, year, day_end, is_copy, tuple(rules), written_day, copy_number)


def _safe_date(year: int, month: int, day: int) -> date | None:
    try:
        return date(year, month, day)
    except ValueError:
        return None


def longest_chronological_run(values: Sequence[date]) -> list[int]:
    """Indices of a longest non-decreasing subsequence of ``values`` (R105 anchors)."""
    tails: list[date] = []
    tail_index: list[int] = []
    previous: list[int] = [-1] * len(values)
    for i, value in enumerate(values):
        position = bisect_right(tails, value)
        if position > 0:
            previous[i] = tail_index[position - 1]
        if position == len(tails):
            tails.append(value)
            tail_index.append(i)
        else:
            tails[position] = value
            tail_index[position] = i
    run: list[int] = []
    current = tail_index[-1] if tail_index else -1
    while current != -1:
        run.append(current)
        current = previous[current]
    return run[::-1]


@dataclass
class _Resolution:
    start: date | None = None
    end: date | None = None
    confidence: str = "none"
    rules: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class _Bounds:
    low: date | None
    high: date | None

    def contains(self, value: date) -> bool:
        return (self.low is None or self.low <= value) and (self.high is None or value <= self.high)

    def interval(self) -> tuple[date | None, date | None]:
        return self.low, self.high


def _complete_year(parsed: ParsedName, bounds: _Bounds) -> tuple[date | None, list[str]]:
    """Name date, completing a missing year from the anchors around the sheet (R103)."""
    day, month = parsed.day, parsed.month
    if day is None or month is None:
        return None, []
    if parsed.year is not None:
        return _safe_date(parsed.year, month, day), []
    years = sorted({b.year for b in (bounds.low, bounds.high) if b is not None})
    candidates = [d for y in years if (d := _safe_date(y, month, day)) and bounds.contains(d)]
    if len(candidates) == 1:
        return candidates[0], ["R103"]
    fallback = _safe_date(years[0], month, day) if years else None
    return fallback, ["R103"]


def _repair_month(name_date: date, written_day: int | None, bounds: _Bounds) -> date | None:
    """Unique date with a neighbouring anchor's month that fits between the anchors (R106).

    The day is taken as resolved and, if different, as written first in the name, so that a
    swapped typo such as "03-25-24" placed in May can still become 3 May.
    """
    months = {b.month for b in (bounds.low, bounds.high) if b is not None}
    days = {name_date.day} | ({written_day} if written_day is not None else set())
    fits = {
        d
        for m in months
        for day in days
        if (d := _safe_date(name_date.year, m, day)) and bounds.contains(d)
    }
    return fits.pop() if len(fits) == 1 else None


def _copy_day(name_date: date, copy_number: int | None, taken: Collection[date]) -> date:
    """Copy "(n)" is n-1 days after its name date, or the same day if that day is taken (R108)."""
    shifted = name_date + timedelta(days=(copy_number or 1) - 1)
    return name_date if shifted in taken else shifted


def _undated(rules: list[str], bounds: _Bounds, has_lines: bool) -> _Resolution:
    """Sheet whose name gives no valid date: excluded if empty (R111), else an interval."""
    if not has_lines:
        return _Resolution(confidence="none", rules=[*rules, "R111"])
    low, high = bounds.interval()
    return _Resolution(low, high, "low", [*rules, "R105"])


def _resolve_point(
    parsed: ParsedName, bounds: _Bounds, taken: Collection[date], has_lines: bool
) -> _Resolution:
    name_date, extra = _complete_year(parsed, bounds)
    rules = [*parsed.rules, *extra]
    if name_date is None:
        return _undated(rules, bounds, has_lines)
    if parsed.is_copy:
        day = _copy_day(name_date, parsed.copy_number, taken)
        return _Resolution(day, day, "medium", [*rules, "R108"])
    if bounds.contains(name_date):
        return _Resolution(name_date, name_date, "medium", [*rules, "R105"])
    if name_date not in taken:
        return _Resolution(name_date, name_date, "medium", [*rules, "R107"])
    repaired = _repair_month(name_date, parsed.written_day, bounds)
    if repaired is not None:
        return _Resolution(repaired, repaired, "medium", [*rules, "R106"])
    low, high = bounds.interval()
    return _Resolution(low, high, "low", [*rules, "R106"])


def _resolve_range(parsed: ParsedName, bounds: _Bounds) -> _Resolution:
    start, extra = _complete_year(parsed, bounds)
    end = None
    if start is not None and parsed.day_end is not None:
        end = _safe_date(start.year, start.month, parsed.day_end)
    if start is None or end is None or end < start:
        low, high = bounds.interval()
        return _Resolution(low, high, "low", [*parsed.rules, *extra, "R105"])
    return _Resolution(start, end, "medium", [*parsed.rules, *extra])


def resolve_sheet_dates(
    sheets: pd.DataFrame,
    sheets_with_lines: Collection[int],
    overrides: Sequence[SheetDateOverride] = (),
) -> pd.DataFrame:
    """Resolve the calendar position of every worksheet in ``sheets`` (StagedSheet rows)."""
    ordered = sheets.sort_values("sheet_index")
    indices = ordered["sheet_index"].tolist()
    names = ordered["sheet_name"].tolist()
    parsed = [parse_sheet_name(n) for n in names]

    candidates = [
        (i, d)
        for i, p in enumerate(parsed)
        if not p.is_copy
        and p.year is not None
        and p.day_end is None
        and p.rules == ("R101",)
        and p.day is not None
        and p.month is not None
        and (d := _safe_date(p.year, p.month, p.day)) is not None
    ]
    run = longest_chronological_run([d for _, d in candidates])
    anchors: dict[int, date] = {candidates[k][0]: candidates[k][1] for k in run}
    anchor_positions = sorted(anchors)

    def bounds_for(position: int) -> _Bounds:
        k = bisect_right(anchor_positions, position)
        low = anchors[anchor_positions[k - 1]] if k > 0 else None
        high = anchors[anchor_positions[k]] if k < len(anchor_positions) else None
        return _Bounds(low, high)

    name_dates = _name_dates(parsed, bounds_for)
    taken = {pos: d for pos, d in name_dates.items() if not parsed[pos].is_copy}
    by_name: Mapping[str, SheetDateOverride] = {o.sheet_name: o for o in overrides}
    records: list[dict[str, object]] = []
    for position, (index, name, p) in enumerate(zip(indices, names, parsed, strict=True)):
        own_date = name_dates.get(position)
        others = {d for pos, d in taken.items() if pos != position}
        if name in by_name:
            override = by_name[name]
            res = _Resolution(override.date_start, override.date_end, "confirmed", ["R110"])
        elif position in anchors:
            res = _Resolution(anchors[position], anchors[position], "high", ["R101", "R105"])
        elif p.day_end is not None:
            res = _resolve_range(p, bounds_for(position))
        else:
            res = _resolve_point(p, bounds_for(position), others, index in sheets_with_lines)
        records.append(
            {
                "sheet_index": index,
                "sheet_name": name,
                "name_date": own_date,
                "is_copy": p.is_copy,
                "is_anchor": position in anchors,
                "date_start": res.start,
                "date_end": res.end,
                "confidence": res.confidence,
                "rules": ",".join(dict.fromkeys(res.rules)),
            }
        )
    frame = pd.DataFrame(records)
    for column in ("name_date", "date_start", "date_end"):
        frame[column] = pd.to_datetime(frame[column])
    return SheetDate.validate(frame)


def _name_dates(
    parsed: Sequence[ParsedName], bounds_for: Callable[[int], _Bounds]
) -> dict[int, date]:
    """Name date of every sheet, after year completion, by workbook position."""
    result: dict[int, date] = {}
    for position, p in enumerate(parsed):
        name_date, _ = _complete_year(p, bounds_for(position))
        if name_date is not None:
            result[position] = name_date
    return result
