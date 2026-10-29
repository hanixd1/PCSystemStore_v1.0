"""Calendar windows: recorded span, complete periods and the sealed final-test span."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

import pandas as pd

FREQUENCY_CODES = {"weekly": "W-SUN", "monthly": "M"}


@dataclass(frozen=True)
class Windows:
    """``development`` is everything before ``test_start``; the test span is sealed until F8."""

    record_start: date
    record_end: date
    test_start: date
    test_end: date

    def as_dict(self) -> dict[str, str]:
        return {k: v.isoformat() for k, v in self.__dict__.items()}


def last_complete_month_end(record_end: date) -> date:
    """Last day of the last calendar month fully covered by the record."""
    next_day = record_end + timedelta(days=1)
    if next_day.month != record_end.month:
        return record_end
    return record_end.replace(day=1) - timedelta(days=1)


def final_test_windows(record_start: date, record_end: date, test_months: int) -> Windows:
    """The final test spans the last ``test_months`` complete months of the record (Table 17)."""
    test_end = last_complete_month_end(record_end)
    first_month = (pd.Timestamp(test_end).to_period("M") - (test_months - 1)).to_timestamp()
    test_start = first_month.date()
    if test_start <= record_start:
        raise ValueError("the record is shorter than the final-test window")
    return Windows(record_start, record_end, test_start, test_end)


def complete_periods(start: date, end: date, frequency: str) -> pd.DataFrame:
    """Calendar periods fully inside [start, end]: Monday-Sunday weeks or calendar months."""
    periods = pd.period_range(start=start, end=end, freq=FREQUENCY_CODES[frequency])
    frame = pd.DataFrame(
        {
            "period_start": periods.start_time.normalize(),
            "period_end": periods.end_time.normalize(),
        }
    )
    inside = (frame["period_start"] >= pd.Timestamp(start)) & (
        frame["period_end"] <= pd.Timestamp(end)
    )
    return frame[inside].reset_index(drop=True)


def split_label(period_start: pd.Series, period_end: pd.Series, windows: Windows) -> pd.Series:
    """``development`` before the test, ``test`` fully inside it, ``excluded`` otherwise."""
    test_start, test_end = pd.Timestamp(windows.test_start), pd.Timestamp(windows.test_end)
    labels = pd.Series("excluded", index=period_start.index)
    labels[period_end < test_start] = "development"
    labels[(period_start >= test_start) & (period_end <= test_end)] = "test"
    return labels
