# F2 - Catalog and demand series

- Date: 2026-10-21
- Plan phase: 2 (series construction and profiling, section 2.6.2)
- Inputs consumed: `data/02_clean` as recorded in `evidence/f1/manifest_02_clean.json`; the series
  step verifies those hashes before running.

## Goal

Turn audited lines into demand series at total, category and SKU level, weekly and monthly, with
their demand pattern, and fix the final-test window and the SKU panel using development data only.

## Delivered

| Item | Location |
|---|---|
| Catalog: SKU = product texts with the same token key (accents, punctuation, word order, spacing and typing variants removed); category by first matching rule; company merges supported | `catalog/build.py`, `configs/catalog.yaml` |
| Final-test window: last 6 complete months of the record; complete weeks (Mon-Sun) and months | `protocol/windows.py` |
| Calendar with `recorded_days` per period, so periods without any sheet are visible, not silent zeros | `series/build.py` |
| Long panel (series × period) for total, 14 categories and every SKU; split `development` / `test` / `excluded` | `series/build.py`, `series/schemas.py` |
| **Physical seal**: development periods in `panel_development.parquet`; test periods in `sealed/panel_sealed.parquet`, which no step reads before F8 | `series/run.py` |
| Profile per series on development periods: zero share, ADI, CV², SBC class; SKU panel = 80 % of development units (plan 2.4.2) | `series/profile.py` |
| `pcs build-series` | `cli.py` |
| Configuration | `configs/series.yaml` (demand movements, date confidences, 80 % share, SBC cut-offs) |

## Results on the real record

Details: `evidence/f2/series_summary.md`.

- Gross demand = `sale_paid` + `sale_credit`: 4,761 lines, 5,216 units.
- Catalog: 1,149 product texts → 1,106 SKUs in 14 categories; storage 28 % of units, keyboard and
  mouse 14 %, motherboards 10 %, RAM 10 %; "other" 2.5 %.
- Windows: record 2024-01-03 → 2026-09-14; **final test 2026-03-01 → 2026-08-31 (sealed)**;
  development = 112 weeks / 26 months.
- SKU panel: 300 SKUs reach 80 % of development units; at weekly level 273 are intermittent and 26
  lumpy; categories are mostly smooth or erratic.
- **17 of the 26 test weeks have no recorded sheet** (2 development weeks too). Combined with the
  structural break (risk R1) this confirms that the weekly SKU test window cannot support the
  planned inference without a protocol amendment.

## Verification

| Check | Result | Evidence |
|---|---|---|
| Unit tests: SKU keys, categories, merges, windows, calendar, panel, SBC classes, SKU selection, profile | pass | `tests/unit/test_catalog_series.py` |
| Integration: F1 → F2 on a synthetic year; seal split; refuses changed clean data | pass | `tests/integration/test_f2_f3_pipeline.py` |
| Host vs container | all tables identical except `cv2` in 5 of 2,240 profile rows (≤ 1.1e-16, one ulp); classes identical | `evidence/f3/host_container_equivalence.txt` |

## Decisions and deviations

- A line is placed in the period of its `date_start` (multi-day sheets span at most four days).
- The panel keeps zero-sale periods as zeros; periods without any sheet carry `recorded_days = 0`
  so the protocol amendment can treat them explicitly.
- SKU identity is automatic and conservative (only exact token-set matches merge). The company can
  merge SKUs that are really the same product through `merges` in `configs/catalog.yaml`.

## Handoff to F3

F3 consumes `data/03_series` as recorded in `evidence/f2/manifest_03_series.json` and reads only
`panel_development.parquet`.
