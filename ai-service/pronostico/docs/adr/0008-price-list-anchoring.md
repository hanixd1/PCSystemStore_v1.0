# ADR-0008: Anchoring the catalog to the distributor price list

- Status: accepted
- Date: 2026-10-23

## Context

Sales texts are free text without product codes (1,106 vecinos SKUs, 1,677 retail SKUs after
removing serials). The owner delivered the current neighbour price list: 427 products with part
numbers and prices. It can identify products and value lost sales, but it is a 2026-10 list (older
products are missing) and wrong links would put wrong prices on lost sales or merge different
products.

## Decision

- Link texts to list products with explainable rules (part number, weighted tokens, compatibility
  guards; `catalog/price_links.py`), never with an opaque similarity model.
- Prefer precision to coverage: ambiguous or weak matches stay `candidate` and are never used.
- Measure precision on the real data by comparing list prices with the prices actually charged.
- Links do not change the catalog. SKUs linked to the same product become **merge proposals** that
  the owner confirms; confirmed merges go to `configs/catalog.yaml`, which is versioned.
- The list price is a current reference: it fills missing prices or gives a sensitivity, and never
  replaces the price recorded at each origin.

## Consequences

- About 30 % of sold units link to a list product; the rest are products no longer listed.
- Catalog quality improves only through owner-validated merges, which keeps the catalog
  "validated by the company" as the plan requires, and keeps every reported result reproducible.
- A new price list (new delivery date) is a new raw file; links are rebuilt from it.
