"""SKU keys and categories for free-text product descriptions.

A SKU is the set of product texts that share a token key: accents removed, punctuation dropped,
typing variants replaced by ``synonyms``, ``stopwords`` removed, tokens sorted and de-duplicated.
Word order and repeated spaces therefore do not create new SKUs. The company can merge further
SKUs through ``catalog.yaml``.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass

import pandas as pd

from pcsforecast.config import CatalogConfig

_QUOTES = re.compile("[\"'\u00b4`]")
_UNITS = frozenset({"GB", "TB", "MHZ", "GHZ", "W", "HZ"})
_NOT_TOKEN = re.compile(r"[^\w./+-]")
SKU_HASH_CHARS = 10
# A parenthesised group of serial numbers (ten or more characters with a digit), and a parenthesis
# left open at the end of a text.
_SERIALS = re.compile(r"\((?=[^)]*\d)[^)]{10,}\)?")
_UNCLOSED = re.compile(r"\([^)]*$")


def strip_accents(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(c for c in decomposed if not unicodedata.combining(c))


def sku_key(text: str, synonyms: Mapping[str, str], stopwords: Sequence[str]) -> str:
    """Order-insensitive token key of a normalised product text."""
    cleaned = strip_accents(text).upper()
    cleaned = _NOT_TOKEN.sub(" ", _QUOTES.sub(" ", cleaned))
    ignored = set(stopwords)
    tokens = {synonyms.get(token, token) for token in _join_units(cleaned.split())}
    return " ".join(sorted(tokens - ignored))


def _join_units(tokens: list[str]) -> list[str]:
    """Glue a unit to the number before it: ``1 TB`` → ``1TB``."""
    joined: list[str] = []
    for token in tokens:
        if token in _UNITS and joined and joined[-1].isdigit():
            joined[-1] += token
        else:
            joined.append(token)
    return joined


def strip_serials(text: str) -> str:
    """Text without the serial-number lists that receipts append in parentheses."""
    return " ".join(_UNCLOSED.sub(" ", _SERIALS.sub(" ", text)).split())


def sku_id(key: str) -> str:
    return "S" + hashlib.sha256(key.encode("utf-8")).hexdigest()[:SKU_HASH_CHARS]


@dataclass(frozen=True)
class _Categorizer:
    rules: tuple[tuple[str, re.Pattern[str]], ...]
    fallback: str

    @classmethod
    def from_config(cls, config: CatalogConfig) -> _Categorizer:
        rules = tuple((rule.id, re.compile(rule.pattern)) for rule in config.categories)
        return cls(rules, config.fallback_category.id)

    def __call__(self, text: str) -> str:
        normalised = strip_accents(text).upper()
        for category, pattern in self.rules:
            if pattern.search(normalised):
                return category
        return self.fallback


@dataclass(frozen=True)
class Catalog:
    """``texts``: product text → SKU; ``skus``: one row per SKU."""

    texts: pd.DataFrame
    skus: pd.DataFrame


def build_catalog(lines: pd.DataFrame, config: CatalogConfig) -> Catalog:
    """Catalog of every product text in valid ``lines`` (CleanLine rows)."""
    valid = lines[lines["status"] == "valid"]
    usage = (
        valid.groupby("product_text")
        .agg(lines=("line_id", "size"), units=("quantity", "sum"))
        .reset_index()
    )
    categorize = _Categorizer.from_config(config)
    usage["sku_key"] = usage["product_text"].map(
        lambda text: sku_key(text, config.synonyms, config.stopwords)
    )
    merged_key = {key: merge.name for merge in config.merges for key in merge.keys}
    usage["sku_group"] = usage["sku_key"].map(lambda key: merged_key.get(key, key))
    usage["sku_id"] = usage["sku_group"].map(sku_id)
    usage["category"] = usage["product_text"].map(categorize)

    by_volume = usage.sort_values(
        ["units", "lines", "product_text"], ascending=[False, False, True]
    )
    skus = (
        by_volume.groupby("sku_id", sort=False)
        .agg(
            sku_name=("product_text", "first"),
            category=("category", "first"),
            n_texts=("product_text", "size"),
            lines=("lines", "sum"),
            units=("units", "sum"),
        )
        .reset_index()
    )
    merged_ids = {sku_id(name) for name in merged_key.values()}
    skus["merged"] = skus["sku_id"].isin(merged_ids)
    texts = usage[["product_text", "sku_key", "sku_id", "category", "lines", "units"]]
    return Catalog(texts=texts.reset_index(drop=True), skus=skus)


def categorizer(config: CatalogConfig) -> Callable[[str], str]:
    """Category of a product text by the first matching rule of ``config``."""
    return _Categorizer.from_config(config)


def category_labels(config: CatalogConfig) -> dict[str, str]:
    labels = {rule.id: rule.label for rule in config.categories}
    labels[config.fallback_category.id] = config.fallback_category.label
    return labels


def catalog_retail(retail: pd.DataFrame, config: CatalogConfig) -> pd.DataFrame:
    """SKU and category of every retail description (serial numbers removed first).

    The same key as the vecinos catalog, so a product sold in both channels gets one SKU id.
    ``retail`` holds ``description`` and ``quantity`` (CleanRetailLine rows).
    """
    usage = (
        retail.dropna(subset=["description"])
        .groupby("description")
        .agg(lines=("quantity", "size"), units=("quantity", "sum"))
        .reset_index()
    )
    usage["product_text"] = usage["description"].map(strip_serials)
    keys = usage["product_text"].map(lambda text: sku_key(text, config.synonyms, config.stopwords))
    merged_key = {key: merge.name for merge in config.merges for key in merge.keys}
    usage["sku_key"] = keys
    usage["sku_id"] = keys.map(lambda key: sku_id(str(merged_key.get(key, key))))
    usage["category"] = usage["product_text"].map(_Categorizer.from_config(config))
    # One category per SKU, from its best-selling text (as in the vecinos catalog).
    leading = usage.sort_values(["units", "description"], ascending=[False, True])
    usage["category"] = usage["sku_id"].map(leading.groupby("sku_id")["category"].first())
    columns = ["description", "product_text", "sku_key", "sku_id", "category", "lines", "units"]
    return usage[columns]
