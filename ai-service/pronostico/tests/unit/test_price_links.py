from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd
import pytest

from pcsforecast.catalog.build import catalog_retail, categorizer, strip_serials
from pcsforecast.catalog.price_links import (
    PriceMatcher,
    is_model,
    link_texts,
    link_tokens,
    price_level,
    sku_prices,
    weight,
)
from pcsforecast.catalog.prices_run import review_table
from pcsforecast.config import CatalogConfig, PriceLinksConfig, load_project_config
from pcsforecast.ingest.price_list import clean_part_number, sheet_items
from pcsforecast.inventory.run import value_at_list_prices

HEADING: list[object] = [None, "PART NUMBER", "DESCRIPCIÓN ", "PRECIO"]


@pytest.fixture
def configs(project_root: Path) -> tuple[CatalogConfig, PriceLinksConfig]:
    folder = project_root / "configs"
    return load_project_config(folder, CatalogConfig), load_project_config(folder, PriceLinksConfig)


def item(item_id: str, description: str, price: float, part: str | None = None) -> dict[str, Any]:
    return {
        "item_id": item_id,
        "part_number": part,
        "description": description,
        "price": price,
        "has_price": price > 0,
        "part_number_repeated": False,
    }


@pytest.fixture
def matcher(configs: tuple[CatalogConfig, PriceLinksConfig]) -> PriceMatcher:
    catalog, links = configs
    items = pd.DataFrame(
        [
            item("P1", "DISCO SOLIDO KINGSTON 1TB NV3 NVME PCIE 4.0", 300, "SNV3S/1000G"),
            item("P2", "DISCO SOLIDO WESTERN DIGITAL 500GB SN350 M.2 PCIEX 3.0 NVME", 200),
            item("P3", "TECLADO REDRAGON KUMARA K552 BLACK RED SWITCH", 120),
            item("P4", "TECLADO REDRAGON KUMARA K552 BLACK BLUE SWITCH", 125),
            item("P5", "MEMORIA RAM PATRIOT 8GB DDR4 3200MHZ", 150),
            item("P6", "MOUSE LOGITECH G203 BLACK", 80, "910-005790"),
            item("P7", "MOUSE LOGITECH G203 BLACK LIGHTSYNC", 80),
            item("P8", "CASE ANTRYX FX 750 BLACK", 180),
            item("P9", "CASE ANTRYX FX 750 WHITE", 190),
            item("P10", "MOUSE GENIUS DX110 USB", 15, "31010116100")
            | {"part_number_repeated": True},
        ]
    )
    return PriceMatcher(items, links, categorizer(catalog))


@pytest.mark.parametrize(
    ("text", "method", "item_id"),
    [
        ("SSD KINGSTON NV3 1TB SNV3S/1000G", "part_number", "P1"),
        ("DISCO SOLIDO WESTER DIGITAL 500GB SN350 M.2 PCIEX GEN3 X4 NVME", "tokens", "P2"),
        ("TECLADO KUMARA BLACK K552 RED SWITCH SPANISH", "tokens", "P3"),
        ("MOUSE LOGITECH G203 BLACK", "tokens", "P6"),  # tied with P7, same price
        ("MEMORIA RAM PATRIOT 8GB DDR5", "none", None),  # DDR4 vs DDR5
        ("DISCO SOLIDO SAMSUNG 1TB NV3 NVME", "none", None),  # another brand
        ("MOUSE GENIUS DX110 31010116100", "tokens", "P10"),  # shared part number unused
        ("CASE ANTRYX FX 750", "candidate", "P8"),  # colour variants with other prices
        ("MANTENIMIENTO DE PC", "excluded", None),
        ("COMPUTADORA: SSD KINGSTON SNV3S/1000G", "excluded", None),
        ("( )", "none", None),
    ],
)
def test_links(matcher: PriceMatcher, text: str, method: str, item_id: str | None) -> None:
    link = matcher.link(text)
    assert (link.method, link.item_id) == (method, item_id)


def test_part_number_inside_a_serial_list_is_not_a_link(matcher: PriceMatcher) -> None:
    link = matcher.link("TECLADO GENERICO USB (SNV3S1000G-ABC1234567-XYZ)")
    assert link.method == "none"


def test_tokens_weights_and_serials(configs: tuple[CatalogConfig, PriceLinksConfig]) -> None:
    _, links = configs
    assert strip_serials("SSD WD 480GB (232601A003EB-232601A005AE) X") == "SSD WD 480GB X"
    assert strip_serials("RAM 16GB (1X16GB) DDR4") == "RAM 16GB (1X16GB) DDR4"
    assert strip_serials("SSD (ABC1234567-") == "SSD"
    assert link_tokens("Disco sólido WD 1 TB 3.0 (SERIE123456)", links) == {
        "SOLIDO",
        "WESTERN",
        "1TB",
        "3.0",
    }
    assert [is_model(t) for t in ("SN350", "500GB", "GEN3", "3200MHZ", "2.5", "SOLIDO")] == [
        True,
        True,
        False,
        False,
        False,
        False,
    ]
    assert [weight(t) for t in ("SN350", "SOLIDO", "GEN3")] == [2.0, 1.0, 0.5]


def test_price_list_blocks_without_their_own_heading_row() -> None:
    rows: list[list[object]] = [
        ["REDRAGON"],
        ["TECLADOS"],
        HEADING,
        [1, " (K552) ", "TECLADO KUMARA", 120],
        ["MOUSE"],  # no heading row repeated
        [1, "M711", "MOUSE COBRA", 0, None, None, 9],
        [2, None, "MOUSE SIN CODIGO", "consultar"],
        [3, "X1", None, 10],
    ]
    items = sheet_items("S", rows)
    assert [(i["family"], i["part_number"], i["has_price"]) for i in items] == [
        ("TECLADOS", "K552", True),
        ("MOUSE", "M711", False),
        ("MOUSE", None, False),
    ]
    assert items[1]["extra_cells"] == "G=9"
    assert clean_part_number(" ") is None
    assert clean_part_number("()") is None


def test_sku_prices_take_the_item_with_most_units() -> None:
    items = pd.DataFrame([item("P1", "A", 100), item("P2", "B", 90), item("P3", "C", 0)])
    links = pd.DataFrame(
        {
            "sku_id": ["S1", "S1", "S1", "S2", "S3"],
            "units": [5.0, 1.0, 9.0, 2.0, 4.0],
            "method": ["tokens", "part_number", "candidate", "tokens", "tokens"],
            "item_id": ["P1", "P2", "P2", "P3", "P1"],
        }
    )
    prices = sku_prices(links, items)
    assert prices[["sku_id", "item_id", "list_price"]].to_numpy().tolist() == [
        ["S1", "P1", 100.0],
        ["S3", "P1", 100.0],
    ]
    assert sku_prices(links.assign(method="none"), items).empty
    assert price_level(prices, pd.DataFrame(columns=["sku_id", "units", "amount"])) == {
        "skus_compared": 0
    }


def test_link_texts_and_review_table(matcher: PriceMatcher) -> None:
    links = link_texts([("retail", "S1", "CASE ANTRYX FX 750", 3)], matcher)
    items = pd.DataFrame([item("P8", "CASE ANTRYX FX 750 BLACK", 180)])
    table = review_table(links, items, limit=10)
    assert "| retail | 3 | CASE ANTRYX FX 750 | CASE ANTRYX FX 750 BLACK | 180 |" in table


def test_retail_catalog_shares_sku_keys_with_vecinos(
    configs: tuple[CatalogConfig, PriceLinksConfig],
) -> None:
    catalog, _ = configs
    retail = pd.DataFrame(
        {
            "description": ["SSD KINGSTON 1TB NV3 (AB12345678-CD)", "1TB NV3 KINGSTON SSD", None],
            "quantity": [2.0, 1.0, 1.0],
        }
    )
    table = catalog_retail(retail, catalog)
    assert len(set(table["sku_id"])) == 1
    assert table["units"].sum() == 3.0
    assert set(table["category"]) == {"storage"}


def test_value_at_list_prices_without_links() -> None:
    simulation = pd.DataFrame(
        {
            "level": ["sku"],
            "key": ["S1"],
            "lost_value": [10.0],
            "lost_unpriced_units": [2.0],
            "lost_units": [3.0],
        }
    )
    valued = value_at_list_prices(simulation, None)
    assert valued["lost_value_list_fill"].tolist() == [10.0]
    priced = value_at_list_prices(simulation, pd.DataFrame({"sku_id": ["S1"], "list_price": [5.0]}))
    assert priced[["lost_value_list_fill", "lost_value_at_list"]].to_numpy().tolist() == [
        [20.0, 15.0]
    ]
