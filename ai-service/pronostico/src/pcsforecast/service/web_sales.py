"""Web-store sales (PostgreSQL ``Order``/``OrderItem``, PAID) added to the served monthly panel.

The thesis series end at the last month of the owner's records. When the web store sells, its
backend exports the PAID orders by month and web category (``npm run export:web-sales``) and
this command turns them into panel rows:

    python -m pcsforecast.service.web_sales web_sales.csv            # channel "web" only
    python -m pcsforecast.service.web_sales web_sales.csv --add-to-total

The rows go to ``web/panel_web.parquet`` next to the served series; the owner's panels are never
rewritten. They are read after the base panels, so a row of the same series and month replaces
the base one.

- Without ``--add-to-total`` only the ``web`` channel is written: the forecasts do not change.
- With ``--add-to-total`` the web units are also added to the ``total`` channel (total and
  category levels), and months after the last recorded one get a zero-filled row for every
  category, so the models see the new months. Use it only when the store's own records of those
  months do not already contain the web orders (invoiced web orders may appear in the receipts).

SKU series are not extended: web products have no link to the thesis SKUs. Afterwards refit
the model (``python -m pcsforecast.service.fit``) and restart the ai-service.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import pandas as pd

from pcsforecast.paths import project_paths
from pcsforecast.service.data import (
    CHANNEL,
    FREQUENCY,
    TOTAL_KEY,
    WEB_PANEL_FILE,
    load_series,
    service_series_dir,
)
from pcsforecast.service.forecast import WEB_CATEGORY_MAP

WEB_CHANNEL = "web"
WEB_PANEL = WEB_PANEL_FILE
FALLBACK_CATEGORY = "other"
CSV_COLUMNS = ("month", "category", "units", "amount")


def read_web_sales(path: Path) -> pd.DataFrame:
    """CSV of the backend export, mapped to the thesis categories (``other`` if unknown)."""
    frame = pd.read_csv(path, dtype={"month": str, "category": str})
    missing = set(CSV_COLUMNS) - set(frame.columns)
    if missing:
        raise ValueError(f"Faltan columnas en {path.name}: {', '.join(sorted(missing))}")
    frame["period_start"] = pd.to_datetime(frame["month"] + "-01", format="%Y-%m-%d")
    frame["key"] = frame["category"].str.upper().map(WEB_CATEGORY_MAP).fillna(FALLBACK_CATEGORY)
    return (
        frame.groupby(["period_start", "key"], as_index=False)[["units", "amount"]]
        .sum()
        .astype({"units": "int64", "amount": "float64"})
    )


Series = tuple[str, str, str]  # channel, level, key


def _row(series: Series, start: pd.Timestamp, units: float, amount: float) -> dict[str, object]:
    channel, level, key = series
    end = start + pd.offsets.MonthEnd(0)
    return {
        "series_id": f"{FREQUENCY}:{channel}:{level}:{key}",
        "frequency": FREQUENCY,
        "channel": channel,
        "level": level,
        "key": key,
        "period_start": start,
        "period_end": end,
        "split": "production",
        "recorded_days": int(end.day),
        "units": int(units),
        "amount": float(amount),
        "lines": int(units),
    }


def _web_rows(sales: pd.DataFrame) -> list[dict[str, object]]:
    rows = [
        _row((WEB_CHANNEL, "category", str(record["key"])), *_values(record))
        for record in sales.to_dict("records")
    ]
    totals = sales.groupby("period_start", as_index=False)[["units", "amount"]].sum()
    rows += [
        _row((WEB_CHANNEL, "total", TOTAL_KEY), *_values(record))
        for record in totals.to_dict("records")
    ]
    return rows


def _values(record: dict[Any, Any]) -> tuple[pd.Timestamp, float, float]:
    return pd.Timestamp(record["period_start"]), float(record["units"]), float(record["amount"])


def _total_rows(panel: pd.DataFrame, sales: pd.DataFrame) -> list[dict[str, object]]:
    """Base ``total`` rows plus web units, for every category and month the export covers."""
    base = panel[(panel["channel"] == CHANNEL) & panel["level"].isin(["total", "category"])]
    last_recorded = base["period_start"].max()
    categories = sorted(base.loc[base["level"] == "category", "key"].unique())
    months = sorted(sales["period_start"].unique())
    # Months after the record need a row in every series, even with no web sale.
    if months and months[-1] > last_recorded:
        months = sorted(
            {
                *months,
                *pd.date_range(last_recorded + pd.DateOffset(months=1), months[-1], freq="MS"),
            }
        )
    by_key = sales.set_index(["period_start", "key"])
    rows: list[dict[str, object]] = []
    for value in months:
        start = pd.Timestamp(value)
        total_units, total_amount = _base_value(base, "total", TOTAL_KEY, start)
        for key in categories:
            units, amount = _base_value(base, "category", key, start)
            if (start, key) in by_key.index:
                units += int(by_key.loc[(start, key), "units"])
                amount += float(by_key.loc[(start, key), "amount"])
            rows.append(_row((CHANNEL, "category", key), start, units, amount))
        if (month := sales[sales["period_start"] == start]).size:
            total_units += int(month["units"].sum())
            total_amount += float(month["amount"].sum())
        rows.append(_row((CHANNEL, "total", TOTAL_KEY), start, total_units, total_amount))
    return rows


def _base_value(base: pd.DataFrame, level: str, key: str, start: pd.Timestamp) -> tuple[int, float]:
    match = base[(base["level"] == level) & (base["key"] == key) & (base["period_start"] == start)]
    if match.empty:
        return 0, 0.0
    return int(match["units"].iloc[0]), float(match["amount"].iloc[0])


def merge_web_sales(csv_path: Path, root: Path | None = None, add_to_total: bool = False) -> Path:
    """Write ``web/panel_web.parquet`` in the served series folder and return its path."""
    paths = project_paths(root)
    series = service_series_dir(paths)
    target = series / WEB_PANEL
    # The owner's panels only: a previous web file must not be added twice.
    store = load_series(paths, include_web=False)
    sales = read_web_sales(csv_path)
    rows = _web_rows(sales)
    if add_to_total:
        rows += _total_rows(store.panel, sales)
    target.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(rows).to_parquet(target, index=False)
    return target


def main() -> None:  # pragma: no cover
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("csv", type=Path, help="CSV de npm run export:web-sales")
    parser.add_argument(
        "--add-to-total",
        action="store_true",
        help="sumar las ventas web al canal total que pronostica el servicio",
    )
    arguments = parser.parse_args()
    target = merge_web_sales(arguments.csv.resolve(), add_to_total=arguments.add_to_total)
    print(f"Escrito {target}")
    print("Siguiente paso: python -m pcsforecast.service.fit y reiniciar el ai-service.")


if __name__ == "__main__":  # pragma: no cover
    main()
