# F2b - Distributor price list and catalog links

- Date: 2026-10-23
- Plan phase: 2 (catalog and series, section 2.6.2), complement
- Inputs consumed: `datos/LISTA DISTRIBUCION PCSYSTEM-17-10-26.xlsx` (registered read-only,
  sha256 `7eb78f12f6aec8d2c88c620447f24c8769c2fbcc9e8561a625135ba40909838d`); the F2 vecinos
  catalog (`data/03_series/catalog_texts.parquet`); the F1b retail items
  (`data/02_clean/retail/retail_lines.parquet`).

## Goal

Use the owner's current price list to (1) anchor the free-text catalog to real products with part
numbers, (2) give the retail receipts the same SKU keys and categories as the vecinos catalog, and
(3) value lost sales that have no recorded price in the inventory simulation. The demand series and
every validation result stay unchanged: catalog changes are proposed, not applied, until the owner
confirms them.

## Delivered

| Item | Location |
|---|---|
| `pcs ingest-prices`: price list → one row per product with family (last block heading), part number, description, price, flags (rules R401-R405) | `ingest/price_list.py`, `data/02_clean/prices/` |
| `pcs link-prices`: links every vecinos catalog text and every retail description to a list product, by part number or by tokens, with compatibility guards | `catalog/price_links.py`, `data/03_series/price_links/` |
| Retail catalog: SKU key and category of every receipt description after removing the serial-number lists in parentheses | `catalog/build.py` (`catalog_retail`), `retail_catalog.parquet` |
| SKU list prices (the priced product linked to most of each SKU's units) | `sku_prices.parquet` |
| Merge proposals: SKUs (either channel) linked to the same list product, for the owner | `merge_proposals.parquet`, `review_merges.md` |
| Weak links to confirm (never used to value anything) | `review.md` |
| Lost sales valued at list price in `pcs simulate`: `list_price`, `lost_value_list_fill` (known prices + list price for the lost units that had none), `lost_value_at_list` (every lost unit at list price, a sensitivity); dashboard column | `inventory/run.py`, `app/dashboard.py` |
| Linking settings (synonyms, brands, exclusive attributes, excluded texts, thresholds) | `configs/price_links.yaml` |

## How a text is linked

1. Texts that are not one product (whole computers, services) are `excluded`.
2. Serial-number lists in parentheses are removed.
3. **Part number**: a product's part number (letters and digits, at least 5, not shared by other
   products) appears in the text.
4. **Tokens**: weighted share of the text's tokens found in the product ≥ 0.8. Model codes
   (SN350, 8500G, 500GB, 4060) weigh 2 and must all be in the product; words weigh 1;
   specifications (GEN3, 3200MHZ, 2.5) weigh 0.5. The text must name at least one model code, and
   the best product must beat the next by 0.1 unless both cost the same known price.
5. Guards for both: same category, same brand when the text names one, no conflicting attribute
   (SATA/NVME, DDR3/4/5, SODIMM/DIMM, wired/wireless, ATX sizes, switch colours, colours) and no
   different frequency (3200MHZ vs 4800MHZ).
6. Scores between 0.6 and the link threshold are `candidate`: listed for review, never used.

Precision was checked on the real data by comparing each linked product's list price with the price
actually charged: of 755 priced links, 18 texts (43 units) differ by more than ×1.67, and the review
of those led to rules 2, 4 (model codes, at least one) and 5 (frequencies); part of the remaining
differences are real price changes (DDR5 memory rose from about S/ 210 to S/ 1,000 with the
component shortage).

## Results on the delivered data

Full reports: `evidence/f2b/price_list_report.md`, `evidence/f2b/price_links_report.md`.

| Aspect | Result |
|---|---|
| Price list | 427 products in 7 sheets and 26 families; 360 with price (S/ 10 - 3,400, median 170), 67 without a current price (R403), 20 sharing a part number (R405), 2 with values outside the table (R404) |
| Vecinos catalog | 30.2 % of units linked (8.9 % by part number, 21.3 % by tokens); 3.2 % candidates; the rest are products no longer on the current list |
| Retail receipts | 27.1 % of units linked (9.9 % by part number, 17.2 % by tokens); 2.4 % candidates |
| SKUs with a list price | 244 of 1,106 vecinos SKUs; 56 of the 300 SKU-panel series in the weekly simulation |
| Price level | For the 243 SKUs with both prices, list price / price charged to neighbours: median 1.00 (quartiles 0.98-1.00) - the list is indeed the neighbour price list |
| Retail catalog | 2,850 descriptions → 1,724 products without serials → 1,677 SKUs; 57 % of retail units are SKUs also sold to neighbours |
| Merge proposals | 117 list products linked to several SKUs (350 SKUs; 126 appear in both channels), e.g. one WD SN350 500GB written in 8 ways |
| Lost-sales value (weekly, L = 1, target 0.95, SKU level, all models) | S/ 88,284 at known prices → S/ 96,384 with list prices for 184 lost units that had none |

## Verification

| Check | Result | Evidence |
|---|---|---|
| `make check` | pass, 259 tests, coverage 98.7 % (price modules 99-100 %) | - |
| Tests in Docker (Python 3.14.9, Debian 13) | pass, 259 tests | `evidence/f2b/tests_container.txt` |
| Inventory simulation | all previous columns identical to the run before this phase; only the three list-price columns added | - |
| Series and validation | unchanged (catalog keys untouched; merges not applied) | - |
| Privacy | the price list holds no personal data; `pcs check-privacy` finds no retail customer name or DNI/RUC; the only matches are 8 one-word vecinos nicknames, 5 of which are words of the distributor's own product list | `pcs check-privacy` |
| SonarQube | gate passed after fixing 3 regular-expression findings; 0 bugs, 0 vulnerabilities, 0 code smells; link tables identical before and after the fixes | `evidence/f2b/sonar_f2b.txt` |

## Decisions and deviations

- The price list is dated 2026-10-17: a **current** price reference, not the historical price.
  Lost sales keep their primary valuation (price known at each origin); list prices only fill the
  units without a price, or give a sensitivity (`lost_value_at_list`). Final-customer prices are
  somewhat higher (owner, 2026-10-23).
- Links never change SKU keys. Merging SKUs changes the demand series and therefore every result,
  so it waits for the owner's review of `review_merges.md`; confirmed groups go to `merges` in
  `configs/catalog.yaml` and the series are rebuilt (development span only; the test stays sealed).
- Whether retail items enter the demand series is part of the plan v3 amendment (channel scope).
