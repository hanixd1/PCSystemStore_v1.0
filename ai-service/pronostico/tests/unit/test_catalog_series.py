from __future__ import annotations

from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from pcsforecast.catalog.build import build_catalog, category_labels, sku_id, sku_key, strip_accents
from pcsforecast.config import CatalogConfig, SkuMerge, load_config
from pcsforecast.protocol.windows import (
    complete_periods,
    final_test_windows,
    last_complete_month_end,
    split_label,
)
from pcsforecast.series.build import build_panel, calendar, demand_lines, recorded_days
from pcsforecast.series.profile import (
    classify,
    demand_statistics,
    demand_structure,
    profile_panel,
    select_skus,
)

SYN = {"WESTER": "WESTERN"}


@pytest.fixture
def catalog_config(project_root: Path) -> CatalogConfig:
    return load_config(project_root / "configs" / "catalog.yaml", CatalogConfig)


def test_strip_accents() -> None:
    assert strip_accents("TÉRMICA AUDÍFONO") == "TERMICA AUDIFONO"


def test_sku_key_ignores_order_spacing_quotes_and_typos() -> None:
    first = sku_key('DISCO SOLIDO WESTERN DIGITAL 1TB GREEN 2.5"  SATA', SYN, ["DE"])
    second = sku_key("DISCO SOLIDO WESTER DIGITAL 1 TB 2.5 GREEN SATA", SYN, ["DE"])
    assert first == second
    assert sku_id(first) == sku_id(second)
    assert sku_id(first).startswith("S")


def test_sku_key_keeps_different_capacities_apart() -> None:
    assert sku_key("SSD 240GB", SYN, []) != sku_key("SSD 480GB", SYN, [])


@pytest.mark.parametrize(
    ("text", "category"),
    [
        ("DISCO SOLIDO KINGSTON 1TB NV2", "storage"),
        ("SSD 500GB", "storage"),
        ("MEMORIA RAM PATRIOT 8GB", "memory"),
        ("MOTHERBOARD MSI B450M DDR4", "motherboard"),
        ("MOTHERBORAD ASROCK B760M", "motherboard"),
        ("TARJETA DE VIDEO MSI RTX 3060", "gpu"),
        ("PASTA TÉRMICA Z3 DEEPCOOL", "cooling"),
        ("CORSAIR H150 REFRIGERACION LIQUIDO", "cooling"),
        ("MON TEROS 27", "monitor"),
        ("ARIES 03", "other"),
    ],
)
def test_categories(catalog_config: CatalogConfig, text: str, category: str) -> None:
    lines = pd.DataFrame(
        {"line_id": ["L1"], "status": ["valid"], "product_text": [text], "quantity": [1]}
    )
    catalog = build_catalog(lines, catalog_config)
    assert catalog.texts.loc[0, "category"] == category


def test_catalog_groups_texts_and_names_skus_by_volume(catalog_config: CatalogConfig) -> None:
    lines = pd.DataFrame(
        {
            "line_id": ["a", "b", "c", "d"],
            "status": ["valid", "valid", "valid", "excluded"],
            "product_text": ["SSD WD 1TB GREEN", "SSD WESTER 1TB GREEN", "SSD WD 1TB GREEN", "X"],
            "quantity": [1, 3, 1, 1],
        }
    )
    config = catalog_config.model_copy(update={"synonyms": {"WD": "WESTERN", "WESTER": "WESTERN"}})
    catalog = build_catalog(lines, config)
    assert len(catalog.skus) == 1
    sku = catalog.skus.iloc[0]
    assert (sku["sku_name"], sku["n_texts"], sku["units"], sku["lines"]) == (
        "SSD WESTER 1TB GREEN",
        2,
        5,
        3,
    )
    assert not sku["merged"]


def test_company_merges(catalog_config: CatalogConfig) -> None:
    lines = pd.DataFrame(
        {
            "line_id": ["a", "b"],
            "status": ["valid", "valid"],
            "product_text": ["RAM 8GB A", "RAM 8GB B"],
            "quantity": [1, 1],
        }
    )
    merge = SkuMerge(name="RAM 8GB", keys=["8GB A RAM", "8GB B RAM"], reason="same product")
    catalog = build_catalog(lines, catalog_config.model_copy(update={"merges": [merge]}))
    assert len(catalog.skus) == 1
    assert catalog.skus.iloc[0]["merged"]


def test_category_labels_include_fallback(catalog_config: CatalogConfig) -> None:
    labels = category_labels(catalog_config)
    assert labels["storage"] == "Almacenamiento"
    assert labels["other"] == "Otros"


def test_windows() -> None:
    assert last_complete_month_end(date(2026, 9, 14)) == date(2026, 8, 31)
    assert last_complete_month_end(date(2026, 8, 31)) == date(2026, 8, 31)
    windows = final_test_windows(date(2024, 1, 3), date(2026, 9, 14), 6)
    assert (windows.test_start, windows.test_end) == (date(2026, 3, 1), date(2026, 8, 31))
    assert windows.as_dict()["record_end"] == "2026-09-14"
    short_start, short_end = date(2026, 5, 1), date(2026, 9, 14)
    with pytest.raises(ValueError, match="shorter"):
        final_test_windows(short_start, short_end, 6)


def test_complete_periods_and_split() -> None:
    weeks = complete_periods(date(2024, 1, 1), date(2024, 1, 20), "weekly")
    assert weeks["period_start"].dt.dayofweek.eq(0).all()
    assert weeks["period_end"].tolist() == [pd.Timestamp("2024-01-07"), pd.Timestamp("2024-01-14")]
    months = complete_periods(date(2024, 1, 1), date(2024, 3, 14), "monthly")
    assert months["period_end"].tolist() == [pd.Timestamp("2024-01-31"), pd.Timestamp("2024-02-29")]
    windows = final_test_windows(date(2024, 1, 1), date(2024, 3, 14), 1)
    labels = split_label(months["period_start"], months["period_end"], windows)
    assert labels.tolist() == ["development", "test"]


def _demand() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "line_id": ["a", "b", "c", "d"],
            "date_start": pd.to_datetime(["2024-01-02", "2024-01-03", "2024-01-10", "2024-02-20"]),
            "quantity": [2, 1, 3, 4],
            "amount": [100.0, 50.0, 30.0, 40.0],
            "product_text": ["A", "B", "A", "B"],
            "sku_id": ["S1", "S2", "S1", "S2"],
            "category": ["storage", "memory", "storage", "memory"],
        }
    )


def test_demand_lines_filters_and_maps() -> None:
    lines = pd.DataFrame(
        {
            "line_id": ["a", "b", "c", "d"],
            "status": ["valid", "valid", "excluded", "valid"],
            "movement_type": ["sale_paid", "return", "sale_paid", "sale_credit"],
            "date_confidence": ["high", "high", "high", "medium"],
            "date_start": pd.to_datetime(["2024-01-02"] * 4),
            "quantity": [1, 1, 1, 2],
            "amount": [1.0, 1.0, 1.0, 2.0],
            "product_text": ["A", "A", "A", "B"],
        }
    )
    texts = pd.DataFrame(
        {"product_text": ["A", "B"], "sku_id": ["S1", "S2"], "category": ["x", "y"]}
    )
    demand = demand_lines(lines, texts, ["sale_paid", "sale_credit"], ["high", "medium"])
    assert demand["line_id"].tolist() == ["a", "d"]
    partial = texts.iloc[:1]
    with pytest.raises(ValueError, match="missing from the catalog"):
        demand_lines(lines, partial, ["sale_paid", "sale_credit"], ["high", "medium"])


def _calendar(frequency: str) -> pd.DataFrame:
    windows = final_test_windows(date(2024, 1, 1), date(2024, 3, 3), 1)
    sheet_dates = pd.DataFrame(
        {
            "sheet_index": [0, 1, 2],
            "date_start": pd.to_datetime(["2024-01-02", "2024-01-10", "2024-02-20"]),
            "date_end": pd.to_datetime(["2024-01-03", "2024-01-10", "2024-02-20"]),
        }
    )
    days = recorded_days(sheet_dates, [0, 1, 2])
    return calendar(pd.Timestamp("2024-01-01"), windows, frequency, days)


def test_calendar_counts_recorded_days() -> None:
    weeks = _calendar("weekly")
    assert weeks["recorded_days"].tolist()[:4] == [2, 1, 0, 0]
    assert set(weeks["split"]) == {"development", "excluded", "test"}  # 29 Jan-4 Feb straddles


def test_build_panel_fills_zeros_for_every_level() -> None:
    panel = build_panel(_demand(), _calendar("weekly"))
    assert set(panel["level"]) == {"total", "category", "sku"}
    total = panel[panel["series_id"] == "weekly:total:total:ALL"]
    assert total["units"].tolist()[:3] == [3, 3, 0]
    assert total["units"].sum() == 10
    sku = panel[panel["series_id"] == "weekly:total:sku:S2"]
    assert len(sku) == len(total)
    assert (panel.groupby("level")["units"].sum() == 10).all()


def test_lines_outside_the_calendar_are_dropped() -> None:
    demand = _demand()
    demand.loc[3, "date_start"] = pd.Timestamp("2025-01-01")
    panel = build_panel(demand, _calendar("monthly"))
    assert panel.loc[panel["level"] == "total", "units"].sum() == 6


@pytest.mark.parametrize(
    ("adi", "cv2", "expected"),
    [
        (1.0, 0.1, "smooth"),
        (1.0, 0.9, "erratic"),
        (2.0, 0.1, "intermittent"),
        (2.0, 0.9, "lumpy"),
        (None, None, "no_demand"),
    ],
)
def test_classify(adi: float | None, cv2: float | None, expected: str) -> None:
    assert classify(adi, cv2, 1.32, 0.49) == expected


def test_demand_statistics() -> None:
    adi, cv2 = demand_statistics(np.array([0, 2, 0, 2]))
    assert (adi, cv2) == (2.0, 0.0)
    assert demand_statistics(np.array([0, 0])) == (None, None)


def test_select_skus_uses_development_only() -> None:
    demand = _demand()
    assert select_skus(demand, date(2024, 2, 1), 0.5) == {"S1"}
    assert select_skus(demand, date(2024, 2, 1), 0.95) == {"S1", "S2"}


def test_profile_uses_development_periods() -> None:
    panel = build_panel(_demand(), _calendar("monthly"))
    profile = profile_panel(panel, {"S1"}, 1.32, 0.49).set_index("series_id")
    assert profile.loc["monthly:total:sku:S1", "periods"] == 1
    assert profile.loc["monthly:total:sku:S1", "units"] == 5
    assert profile.loc["monthly:total:sku:S1", "selected"]
    assert not profile.loc["monthly:total:sku:S2", "selected"]
    assert profile.loc["monthly:total:category:memory", "selected"]


def test_receipts_become_demand_and_possible_duplicates_are_flagged() -> None:
    from pcsforecast.series.build import (  # noqa: PLC0415
        channel_days,
        channel_demand,
        possible_duplicates,
        receipt_days,
        receipt_demand,
    )

    catalog_texts = pd.DataFrame(
        {"product_text": ["SSD 1TB", "RAM 8GB"], "sku_id": ["S1", "S2"], "category": ["a", "b"]}
    )
    retail = pd.DataFrame(
        {
            "line_id": ["R1", "R2", "R3"],
            "issue_date": pd.to_datetime(["2024-01-10", "2024-01-20", "2024-02-01"]),
            "quantity": [1.0, 2.0, 1.0],
            "net_amount": [100.0, 50.0, 80.0],
            "description": ["SSD 1TB (SN1234567890-AB)", "RAM 8GB", None],
        }
    )
    receipts = receipt_demand(retail, catalog_texts, 0.18)
    assert receipts["sku_id"].tolist() == ["S1", "S2"]
    assert receipts["amount"].round(2).tolist() == [118.0, 59.0]
    vecinos = pd.DataFrame(
        {
            "line_id": ["V1", "V2"],
            "date_start": pd.to_datetime(["2024-01-12", "2024-01-30"]),
            "quantity": [1, 2],
            "amount": [120.0, 60.0],
            "product_text": ["SSD 1TB", "RAM 8GB"],
            "sku_id": ["S1", "S2"],
            "category": ["a", "b"],
        }
    )
    duplicate = possible_duplicates(vecinos, receipts, window_days=3)
    assert duplicate.tolist() == [True, False]  # same SKU and quantity 2 days apart; 10 days
    assert len(channel_demand(vecinos, receipts, duplicate, "total")) == 4
    assert len(channel_demand(vecinos, receipts, duplicate, "total_dedup")) == 3
    assert channel_demand(vecinos, receipts, duplicate, "facturado")["line_id"].tolist() == [
        "R1",
        "R2",
    ]
    sheets = pd.Series(1, index=pd.DatetimeIndex(["2024-01-12"]))
    days = receipt_days(receipts)
    assert len(channel_days(sheets, days, "vecinos")) == 1
    assert len(channel_days(sheets, days, "facturado")) == 2
    assert len(channel_days(sheets, days, "total")) == 3


def test_demand_structure_counts_months_customers_and_concentration() -> None:
    demand = pd.DataFrame(
        {
            "date_start": pd.to_datetime(
                ["2025-01-05", "2025-01-20", "2025-02-03", "2025-03-10", "2026-04-01"]
            ),
            "quantity": [3, 1, 1, 0, 9],
            "sku_id": ["S1", "S1", "S2", "S2", "S1"],
            "category": ["memory", "memory", "storage", "storage", "memory"],
            "customer_code": ["C1", "C2", "C1", None, "C3"],
        }
    )
    table = demand_structure(demand, date(2026, 3, 1)).set_index(["level", "key"])

    def value(level: str, key: str, column: str) -> float:
        return float(np.asarray(table.loc[(level, key), column]))

    # The 2026-04 line is in the test span; the zero-quantity line is not a sale.
    assert value("total", "ALL", "months_with_sales") == 2
    assert value("total", "ALL", "customers") == 2
    assert value("total", "ALL", "top_customer_share") == pytest.approx(4 / 5)
    assert value("total", "ALL", "top_sku_share") == pytest.approx(4 / 5)
    assert value("sku", "S1", "months_with_sales") == 1
    assert value("sku", "S1", "customers") == 2
    assert np.isnan(value("sku", "S1", "top_sku_share"))
    unknown = demand.assign(customer_code=None)
    shares = demand_structure(unknown, date(2026, 3, 1))["top_customer_share"]
    assert shares.isna().all()
