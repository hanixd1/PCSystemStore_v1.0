"""Links between sales texts (vecinos catalog, retail receipts) and the distributor price list.

A text is linked to a list item

1. by **part number**: the item's part number (letters and digits only, at least
   ``min_part_number_length`` characters, not shared by other items) appears inside the text; or
2. by **tokens**: the share of the text's token weight found in the item is at least
   ``min_link_score`` (model codes such as SN350 or 500GB weigh 2, words 1, specifications such
   as GEN3 or 3200MHZ 0.5), the text names at least one model code and all of them are in the
   item, and the best item beats the next one by ``min_margin`` (or the tied items cost the same).

Both require compatible items: same category (when both are known), the same brand when the text
names one, no conflicting attribute of an ``exclusive_groups`` group (SATA vs NVME, DDR4 vs
DDR5…) and no different frequency (3200MHZ vs 4800MHZ). Weaker matches are kept as
``candidate`` for the owner's review and never value anything.
Texts matching ``excluded_patterns`` (whole computers, services) are ``excluded``. Serial-number
lists in parentheses are removed before matching.
Links never change the SKU keys of the series.
"""

from __future__ import annotations

import re
from collections import defaultdict
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd

from pcsforecast.catalog.build import strip_accents, strip_serials
from pcsforecast.config import PriceLinksConfig

LINKED = ("part_number", "tokens")
LINK_COLUMNS = ["source", "key", "text", "units", "method", "item_id", "score"]
_QUOTES = re.compile("[\"'\u00b4`]")
_NOT_TOKEN = re.compile(r"[^\w./+-]")
_ALNUM = re.compile(r"[^0-9A-Z]")
_UNITS = frozenset({"GB", "TB", "MHZ", "GHZ", "W", "HZ", "MM"})
OTHER_CATEGORY = "other"


# Technical specifications that list and sales texts write differently or leave out.
_SPEC = re.compile(
    r"^(?:GEN\d+|X\d+|PCIEX?\d*(?:\.\d)?|M\.?2|DDR\d|CL\d+|\d{1,2}|\d+\.\d+"
    r"|\d+(?:\.\d+)?(?:MHZ|GHZ|HZ|MB|MM|K|DPI|V))$"
)
MODEL_WEIGHT, WORD_WEIGHT, SPEC_WEIGHT = 2.0, 1.0, 0.5


def _has_digit(token: str) -> bool:
    return any(c.isdigit() for c in token)


def is_model(token: str) -> bool:
    """A token with digits that names the product (SN350, 8500G, 500GB, 4060), not a
    specification (GEN3, 3200MHZ, 2.5, the 7 of "RYZEN 7")."""
    return _has_digit(token) and _SPEC.match(token) is None


def weight(token: str) -> float:
    if is_model(token):
        return MODEL_WEIGHT
    return SPEC_WEIGHT if _has_digit(token) else WORD_WEIGHT


def link_tokens(text: str, config: PriceLinksConfig) -> frozenset[str]:
    """Upper-case tokens without accents, units glued to their number, synonyms applied."""
    cleaned = _NOT_TOKEN.sub(" ", _QUOTES.sub(" ", strip_accents(strip_serials(text)).upper()))
    tokens: list[str] = []
    for raw in cleaned.split():
        token = raw.strip("./-+")
        if token in _UNITS and tokens and tokens[-1].replace(".", "").isdigit():
            tokens[-1] += token
        elif token:
            tokens.append(token)
    ignored = set(config.stopwords)
    return frozenset(config.synonyms.get(t, t) for t in tokens) - ignored


def _frequencies(tokens: frozenset[str]) -> frozenset[str]:
    """Memory or CPU frequencies (3200MHZ, 4.20GHZ): two different ones exclude each other."""
    return frozenset(t for t in tokens if t.endswith(("MHZ", "GHZ")) and _has_digit(t))


def alnum(text: str) -> str:
    return _ALNUM.sub("", strip_accents(text).upper())


@dataclass(frozen=True)
class _Item:
    item_id: str
    tokens: frozenset[str]
    part_number: str | None
    price: float | None
    category: str
    brands: frozenset[str]


@dataclass(frozen=True)
class Link:
    method: str  # part_number, tokens, candidate, none
    item_id: str | None
    score: float


NO_LINK = Link("none", None, 0.0)
EXCLUDED = Link("excluded", None, 0.0)


class PriceMatcher:
    """Finds the list item of a sales text."""

    def __init__(
        self, items: pd.DataFrame, config: PriceLinksConfig, categorize: Callable[[str], str]
    ) -> None:
        self.config = config
        self.categorize = categorize
        self.brands = frozenset(config.brands)
        self.groups = [frozenset(group) for group in config.exclusive_groups]
        self.excluded = [re.compile(pattern) for pattern in config.excluded_patterns]
        self.items: list[_Item] = []
        self.by_token: dict[str, list[int]] = defaultdict(list)
        for row in items.to_dict("records"):
            part = row["part_number"]
            # The part number is one more word of the item (texts sometimes quote it).
            tokens = link_tokens(f"{row['description']} {part or ''}", config)
            usable = (
                isinstance(part, str)
                and not row["part_number_repeated"]
                and len(alnum(part)) >= config.min_part_number_length
            )
            item = _Item(
                item_id=str(row["item_id"]),
                tokens=tokens,
                part_number=alnum(part) if usable and isinstance(part, str) else None,
                price=float(row["price"]) if row["has_price"] else None,
                category=categorize(str(row["description"])),
                brands=tokens & self.brands,
            )
            for token in tokens:
                self.by_token[token].append(len(self.items))
            self.items.append(item)

    def _compatible(self, tokens: frozenset[str], category: str, item: _Item) -> bool:
        if OTHER_CATEGORY not in (category, item.category) and category != item.category:
            return False
        brands = tokens & self.brands
        if brands and not brands & item.brands:
            return False
        groups = [*self.groups, _frequencies(tokens | item.tokens)]
        return all(
            not ((tokens & group) and (item.tokens & group) and not (tokens & item.tokens & group))
            for group in groups
        )

    def _by_part_number(self, product: str, tokens: frozenset[str], category: str) -> Link | None:
        packed = alnum(product)  # serial numbers removed: they may contain part numbers
        found = [
            item
            for item in self.items
            if item.part_number
            and item.part_number in packed
            and self._compatible(tokens, category, item)
        ]
        if not found:
            return None
        best = max(found, key=lambda item: len(item.part_number or ""))
        return Link("part_number", best.item_id, 1.0)

    def _scores(self, tokens: frozenset[str], category: str) -> list[tuple[float, _Item]]:
        total = sum(weight(t) for t in tokens)
        models = {t for t in tokens if is_model(t)}
        seen = {i for t in tokens for i in self.by_token.get(t, ())}
        scored: list[tuple[float, _Item]] = []
        for index in seen:
            item = self.items[index]
            if not self._compatible(tokens, category, item):
                continue
            score = sum(weight(t) for t in tokens & item.tokens) / total
            penalty = 0.0 if models <= item.tokens else 1.0  # the text's model codes must match
            scored.append((score - penalty, item))
        return sorted(scored, key=lambda pair: (-pair[0], pair[1].item_id))

    def link(self, text: str) -> Link:
        product = strip_serials(text)
        if any(pattern.search(product) for pattern in self.excluded):
            return EXCLUDED
        tokens = link_tokens(product, self.config)
        if not tokens:
            return NO_LINK
        category = self.categorize(product)
        by_part = self._by_part_number(product, tokens, category)
        return by_part if by_part is not None else self._by_tokens(tokens, category)

    def _by_tokens(self, tokens: frozenset[str], category: str) -> Link:
        scored = self._scores(tokens, category)
        if not scored:
            return NO_LINK
        best_score, best = scored[0]
        rivals = [item for score, item in scored[1:] if best_score - score < self.config.min_margin]
        # Close rivals are harmless only when they cost the same (both prices known).
        clear = all(item.price is not None and item.price == best.price for item in rivals)
        named = any(is_model(token) for token in tokens)  # "SSD WESTERN DIGITAL" names no model
        if best_score >= self.config.min_link_score and clear and named:
            return Link("tokens", best.item_id, round(best_score, 4))
        if best_score >= self.config.min_candidate_score:
            return Link("candidate", best.item_id, round(best_score, 4))
        return NO_LINK


def link_texts(rows: Iterable[tuple[str, str, str, float]], matcher: PriceMatcher) -> pd.DataFrame:
    """``(source, key, text, units)`` rows with their link."""
    records: list[dict[str, Any]] = []
    for source, key, text, units in rows:
        link = matcher.link(text)
        records.append(
            {
                "source": source,
                "key": key,
                "text": text,
                "units": float(units),
                "method": link.method,
                "item_id": link.item_id,
                "score": link.score,
            }
        )
    return pd.DataFrame(records, columns=LINK_COLUMNS)


def sku_prices(links: pd.DataFrame, items: pd.DataFrame) -> pd.DataFrame:
    """One list price per SKU: the priced item linked to most of the SKU's units."""
    linked = links[links["method"].isin(LINKED)].merge(
        items.loc[items["has_price"], ["item_id", "price"]], on="item_id"
    )
    columns = ["sku_id", "item_id", "list_price", "linked_units", "methods"]
    if linked.empty:
        return pd.DataFrame(columns=columns)
    by_item = (
        linked.groupby(["sku_id", "item_id", "price"])
        .agg(linked_units=("units", "sum"), methods=("method", lambda m: ",".join(sorted(set(m)))))
        .reset_index()
        .sort_values(["sku_id", "linked_units", "item_id"], ascending=[True, False, True])
    )
    chosen = by_item.drop_duplicates("sku_id").rename(columns={"price": "list_price"})
    return chosen[columns].reset_index(drop=True)


def price_level(skus: pd.DataFrame, observed: pd.DataFrame) -> dict[str, Any]:
    """List price relative to the unit price observed in vecinos sales, per linked SKU.

    ``observed`` holds priced vecinos sale lines (sku_id, units, amount). The list is a current
    (2026-10) neighbour price list, so the ratio mixes price changes with link quality.
    """
    unit_prices = observed.groupby("sku_id").agg(units=("units", "sum"), amount=("amount", "sum"))
    unit_prices["observed_price"] = unit_prices["amount"] / unit_prices["units"]
    joined = skus.join(unit_prices["observed_price"], on="sku_id").dropna(subset=["observed_price"])
    if joined.empty:
        return {"skus_compared": 0}
    ratio = joined["list_price"] / joined["observed_price"]
    return {
        "skus_compared": len(joined),
        "median_list_to_observed": float(np.median(ratio)),
        "p25_list_to_observed": float(np.quantile(ratio, 0.25)),
        "p75_list_to_observed": float(np.quantile(ratio, 0.75)),
    }


def merge_proposals(links: pd.DataFrame, items: pd.DataFrame, names: pd.Series) -> pd.DataFrame:
    """SKUs linked to the same list item: probably one product written in different ways.

    ``links`` holds both channels' links keyed by ``sku_id`` (column ``key``); ``names`` maps a
    SKU to its best-selling text. Proposals only: the catalog changes when the owner confirms
    them through ``merges`` in ``catalog.yaml``.
    """
    linked = links[links["method"].isin(LINKED)]
    per_sku = linked.groupby(["item_id", "key", "source"])["units"].sum().reset_index()
    skus_per_item = per_sku.groupby("item_id")["key"].transform("nunique")
    grouped = per_sku[skus_per_item > 1].rename(columns={"key": "sku_id"})
    grouped = grouped.merge(items[["item_id", "description"]], on="item_id").rename(
        columns={"description": "item_description"}
    )
    grouped["sku_name"] = grouped["sku_id"].map(names)
    columns = ["item_id", "item_description", "sku_id", "sku_name", "source", "units"]
    return grouped.sort_values(["item_id", "units"], ascending=[True, False])[columns].reset_index(
        drop=True
    )


def merge_review(proposals: pd.DataFrame) -> str:
    """Markdown for the owner: one block per list item, its SKUs by units sold."""
    lines = [
        "# Catalog merges to confirm",
        "",
        "Each block is one product of the distributor price list and the SKUs (product texts) that",
        "were linked to it. If they are the same product, the SKUs can be merged in the catalog.",
        "Product texts only; no customer data.",
        "",
    ]
    totals = proposals.groupby("item_id")["units"].sum().sort_values(ascending=False)
    for item_id in totals.index:
        block = proposals[proposals["item_id"] == item_id]
        lines += [f"## {block['item_description'].iloc[0]}", "", "| Channel | Units | Text |"]
        lines.append("|---|---|---|")
        lines += [f"| {r.source} | {r.units:g} | {r.sku_name} |" for r in block.itertuples()]
        lines.append("")
    return "\n".join(lines)
