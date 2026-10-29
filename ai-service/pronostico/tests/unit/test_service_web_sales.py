"""Production service (F11): PAID web-store sales added to the served panel."""

from pathlib import Path

import pandas as pd
import pytest

from pcsforecast.paths import project_paths
from pcsforecast.service.data import SERVICE_SERIES_ENV, load_series
from pcsforecast.service.forecast import ForecastEngine, StatisticalQuantiles
from pcsforecast.service.synthetic import write_synthetic_project
from pcsforecast.service.web_sales import WEB_PANEL, merge_web_sales, read_web_sales

# The synthetic store records 2024-01 .. 2026-08.
CSV = """month,category,units,amount
2026-08,MOUSE,2,120.00
2026-08,LAPTOP,1,3500.00
2026-10,KEYBOARD,3,150.00
2026-10,GPU,1,1600.00
"""


@pytest.fixture
def root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.delenv(SERVICE_SERIES_ENV, raising=False)
    write_synthetic_project(tmp_path / "root")
    (tmp_path / "web_sales.csv").write_text(CSV, encoding="utf-8")
    return tmp_path / "root"


def _units(panel: pd.DataFrame, channel: str, level: str, key: str, month: str) -> int:
    rows = panel[
        (panel["channel"] == channel)
        & (panel["level"] == level)
        & (panel["key"] == key)
        & (panel["period_start"] == pd.Timestamp(f"{month}-01"))
    ]
    return int(rows["units"].sum())


def test_web_categories_map_to_thesis_categories(root: Path) -> None:
    sales = read_web_sales(root.parent / "web_sales.csv")
    assert set(sales["key"]) == {"keyboard_mouse", "other", "gpu"}


def test_web_channel_only_leaves_the_forecast_series_unchanged(root: Path) -> None:
    paths = project_paths(root)
    before = load_series(paths)
    merge_web_sales(root.parent / "web_sales.csv", root)
    after = load_series(paths)

    assert after.last_month == before.last_month
    assert _units(after.panel, "web", "total", "ALL", "2026-10") == 4
    assert after.total().tolist() == before.total().tolist()


def test_add_to_total_extends_the_series_with_zero_filled_months(root: Path) -> None:
    paths = project_paths(root)
    before = load_series(paths)
    merge_web_sales(root.parent / "web_sales.csv", root, add_to_total=True)
    # Running it twice must not add the web units twice.
    merge_web_sales(root.parent / "web_sales.csv", root, add_to_total=True)
    after = load_series(paths)

    assert after.last_month == pd.Timestamp("2026-10-01")
    base_august = _units(before.panel, "total", "total", "ALL", "2026-08")
    assert _units(after.panel, "total", "total", "ALL", "2026-08") == base_august + 3
    assert _units(after.panel, "total", "total", "ALL", "2026-09") == 0
    assert _units(after.panel, "total", "category", "gpu", "2026-10") == 1
    histories = after.histories("category", context=None)
    assert len({len(values) for values in histories.values()}) == 1  # no gaps

    engine = ForecastEngine(after, StatisticalQuantiles())
    assert engine.first_forecast_month == pd.Timestamp("2026-11-01")
    assert (after.source / WEB_PANEL).is_file()
