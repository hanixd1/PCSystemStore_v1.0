"""F2b steps: ingest the distributor price list, then link catalog and retail texts to it."""

from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pandas as pd

from pcsforecast.audit.report import render_markdown
from pcsforecast.catalog.build import catalog_retail, categorizer
from pcsforecast.catalog.price_links import (
    LINKED,
    PriceMatcher,
    link_texts,
    merge_proposals,
    merge_review,
    price_level,
    sku_prices,
)
from pcsforecast.config import CatalogConfig, PriceLinksConfig, file_sha256
from pcsforecast.ingest.price_list import extract_price_list
from pcsforecast.manifest import StepManifest, verify_outputs
from pcsforecast.paths import ProjectPaths

PRICE_SOURCE = "price_list"
PRICES_DIR = "prices"
PRICE_LIST_FILE = "price_list.parquet"
LINKS_DIR = "price_links"
SKU_PRICES_FILE = "sku_prices.parquet"
REPORT_FILE = "report.json"
SALE_MOVEMENTS = ("sale_paid", "sale_credit")


class PriceInputError(RuntimeError):
    """A step's inputs are missing or differ from what the previous step handed over."""


def _check(directory: Path, root: Path, what: str) -> None:
    if not (directory / "manifest.json").is_file():
        raise PriceInputError(f"{what} not found in {directory}")
    changed = verify_outputs(directory, root)
    if changed:
        raise PriceInputError(f"{what} differ from their manifest: {changed}")


def _write_report(manifest: StepManifest, out: Path, report: dict[str, Any], title: str) -> None:
    path = out / REPORT_FILE
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    manifest.add_output(path)
    markdown = out / "report.md"
    markdown.write_text(render_markdown(report, title), encoding="utf-8")
    manifest.add_output(markdown)


def run_ingest_prices(paths: ProjectPaths) -> Path:
    """The latest registered price list into ``data/02_clean/prices`` (rules R401-R405)."""
    _check(paths.raw, paths.root, "registered raw files")
    files = sorted((paths.raw / PRICE_SOURCE).glob("*.xlsx"))
    if not files:
        raise PriceInputError("no registered price list; run pcs register-raw")
    source = files[-1]
    items = extract_price_list(source, file_sha256(source))
    out = paths.clean / PRICES_DIR
    out.mkdir(parents=True, exist_ok=True)
    manifest = StepManifest(step="ingest_prices", root=paths.root)
    manifest.add_input(source)
    manifest.add_input(paths.configs / "data_rules.yaml")
    manifest.write_parquet(items, out / PRICE_LIST_FILE)
    priced = items[items["has_price"]]
    report = {
        "source": {"file": source.name, "sha256": file_sha256(source)},
        "items": {
            "total": len(items),
            "with_price": len(priced),
            "without_price": int((~items["has_price"]).sum()),
            "sharing_a_part_number": int(items["part_number_repeated"].sum()),
            "with_values_outside_the_table": int(items["extra_cells"].notna().sum()),
            "by_sheet": items["sheet"].value_counts().sort_index().to_dict(),
        },
        "prices": {
            "min": float(priced["price"].min()),
            "median": float(priced["price"].median()),
            "max": float(priced["price"].max()),
        },
    }
    _write_report(manifest, out, report, "distributor price list")
    manifest.details = {"items": len(items), "with_price": len(priced)}
    return manifest.write(out)


RETAIL_LINES = Path("retail") / "retail_lines.parquet"


def _retail_lines(paths: ProjectPaths) -> pd.DataFrame:
    """Audited retail items, or an empty table when the receipts have not been audited."""
    path = paths.clean / RETAIL_LINES
    if not path.is_file():
        return pd.DataFrame(
            {"description": pd.Series(dtype=str), "quantity": pd.Series(dtype=float)}
        )
    _check(path.parent, paths.root, "audited retail receipts")
    return pd.read_parquet(path)


def _retail_catalog_report(retail: pd.DataFrame, vecinos: pd.DataFrame) -> dict[str, Any]:
    units = float(retail["units"].sum()) or 1.0
    shared = retail["sku_id"].isin(set(vecinos["sku_id"]))
    return {
        "descriptions": len(retail),
        "products_without_serials": int(retail["product_text"].nunique()),
        "skus": int(retail["sku_id"].nunique()),
        "unit_share_in_skus_also_sold_to_vecinos": round(
            float(retail.loc[shared, "units"].sum()) / units, 4
        ),
        "units_by_category": {
            str(k): float(v)
            for k, v in retail.groupby("category")["units"].sum().sort_values().items()
        },
    }


def _coverage(links: pd.DataFrame) -> dict[str, Any]:
    by_method = links.groupby("method")["units"].sum()
    total = float(by_method.sum()) or 1.0
    return {
        "texts": len(links),
        "units": float(by_method.sum()),
        "unit_share_by_method": {k: round(float(v) / total, 4) for k, v in by_method.items()},
    }


def review_table(links: pd.DataFrame, items: pd.DataFrame, limit: int) -> str:
    """Candidates by units, for the owner to confirm (product texts only, no customer data)."""
    described = links[links["method"] == "candidate"].merge(
        items[["item_id", "description", "price"]], on="item_id"
    )
    top = described.sort_values("units", ascending=False).head(limit)
    lines = [
        "# Price-list links to confirm",
        "",
        "Weak matches between sales texts and the price list, by units sold. They are not used to",
        "value anything until confirmed.",
        "",
        "| Source | Units | Sales text | Closest price-list item | Price | Score |",
        "|---|---|---|---|---|---|",
    ]
    lines += [
        f"| {r.source} | {r.units:g} | {r.text} | {r.description} | {r.price:g} | {r.score:.2f} |"
        for r in top.itertuples()
    ]
    return "\n".join(lines) + "\n"


def _channel_of(vecinos: set[str], receipts: set[str]) -> Callable[[str], str]:
    def label(sku: str) -> str:
        if sku in vecinos and sku in receipts:
            return "both"
        return "receipts" if sku in receipts else "vecinos"

    return label


def run_link_prices(
    paths: ProjectPaths, catalog_config: CatalogConfig, config: PriceLinksConfig
) -> Path:
    """Link vecinos catalog texts and retail texts to the price list (``data/03_series``)."""
    prices_dir = paths.clean / PRICES_DIR
    _check(prices_dir, paths.root, "ingested price list")
    _check(paths.series, paths.root, "series files")
    items = pd.read_parquet(prices_dir / PRICE_LIST_FILE)
    catalog = pd.read_parquet(paths.series / "catalog_texts.parquet")
    retail = catalog_retail(_retail_lines(paths), catalog_config)
    matcher = PriceMatcher(items, config, categorizer(catalog_config))
    catalog_links = link_texts(
        (
            ("catalog", sku, text, units)
            for sku, text, units in zip(
                catalog["sku_id"], catalog["product_text"], catalog["units"], strict=True
            )
        ),
        matcher,
    )
    retail_links = link_texts(
        (
            ("retail", sku, text, units)
            for sku, text, units in zip(
                retail["sku_id"], retail["description"], retail["units"], strict=True
            )
        ),
        matcher,
    )
    links = pd.concat([catalog_links, retail_links], ignore_index=True)
    skus = sku_prices(catalog_links.rename(columns={"key": "sku_id"}), items)

    vecinos = pd.read_parquet(paths.clean / "vecinos_lines.parquet")
    sales = vecinos["movement_type"].isin(SALE_MOVEMENTS) & (vecinos["status"] == "valid")
    vecinos_skus = set(
        vecinos[sales].merge(catalog[["product_text", "sku_id"]], on="product_text")["sku_id"]
    )
    sold = vecinos[sales & (vecinos["amount"] > 0)]
    observed = sold.merge(catalog[["product_text", "sku_id"]], on="product_text").rename(
        columns={"quantity": "units"}
    )

    out = paths.series / LINKS_DIR
    out.mkdir(parents=True, exist_ok=True)
    manifest = StepManifest(step="link_prices", root=paths.root)
    manifest.add_input(prices_dir / PRICE_LIST_FILE)
    manifest.add_input(paths.series / "catalog_texts.parquet")
    if (paths.clean / RETAIL_LINES).is_file():
        manifest.add_input(paths.clean / RETAIL_LINES)
    for config_file in ("catalog.yaml", "price_links.yaml"):
        manifest.add_input(paths.configs / config_file)
    manifest.write_parquet(links, out / "text_links.parquet")
    manifest.write_parquet(skus, out / SKU_PRICES_FILE)
    linked_retail = retail.join(
        retail_links.set_index("text")[["method", "item_id", "score"]], on="description"
    )
    manifest.write_parquet(linked_retail, out / "retail_catalog.parquet")
    names = pd.concat(
        [
            pd.read_parquet(paths.series / "catalog_skus.parquet").set_index("sku_id")["sku_name"],
            retail.sort_values("units", ascending=False).groupby("sku_id")["product_text"].first(),
        ]
    )
    # The catalog holds every text of both channels, so its links alone give the proposals.
    proposals = merge_proposals(catalog_links, items, names[~names.index.duplicated()])
    proposals["source"] = proposals["sku_id"].map(_channel_of(vecinos_skus, set(retail["sku_id"])))
    manifest.write_parquet(proposals, out / "merge_proposals.parquet")
    merges_md = out / "review_merges.md"
    merges_md.write_text(merge_review(proposals), encoding="utf-8")
    manifest.add_output(merges_md)
    review = out / "review.md"
    review.write_text(review_table(links, items, limit=150), encoding="utf-8")
    manifest.add_output(review)
    linked_items = links.loc[links["method"].isin(LINKED), "item_id"].nunique()
    report = {
        "catalog": _coverage(catalog_links),
        "retail_receipts": _coverage(retail_links),
        "retail_catalog": _retail_catalog_report(retail, catalog),
        "skus": {
            "in_catalog": int(catalog["sku_id"].nunique()),
            "with_list_price": len(skus),
            "list_items_linked": int(linked_items),
        },
        "merge_proposals": {
            "list_items_with_several_skus": int(proposals["item_id"].nunique()),
            "skus_involved": int(proposals["sku_id"].nunique()),
            "skus_by_channel": proposals.drop_duplicates("sku_id")["source"]
            .value_counts()
            .sort_index()
            .to_dict(),
        },
        "price_level": price_level(skus, observed),
    }
    _write_report(manifest, out, report, "price-list links")
    manifest.details = {"skus_with_list_price": len(skus)}
    return manifest.write(out)
