# F2c - Demand series by channel (protocol amendment v3)

- Date: 2026-10-23
- Plan phase: 2 (series construction, section 2.6.2), as amended by
  `docs/process/protocol_amendment_v3.md`
- Inputs consumed: F1 clean vecinos lines, F1b retail items (1,151 receipts after the November 2024
  facturas were delivered), catalog and series configuration, `protocol.yaml` with
  `structural_break: 2025-05-01`.

## Goal

Implement decisions D1-D5 of the amendment: total demand (vecinos record + delivered receipts) as
the primary series, each channel as secondary, a deduplicated sensitivity, periods without a vecinos
sheet as confirmed zeros, the SKU panel selected on total demand, and the break date recorded in
the protocol. The final test span is unchanged and stays sealed.

## Delivered

| Item | Location |
|---|---|
| Channel dimension: `total`, `vecinos`, `facturado`, `total_dedup`; `series_id` = `<frequency>:<channel>:<level>:<key>` | `series/build.py`, `series/schemas.py` |
| Receipt items as demand lines (product text without serials, amount = net value × (1 + IGV)) | `receipt_demand` |
| Possible duplicates: receipt lines with a vecinos line of the same SKU and quantity within 3 days | `possible_duplicates` |
| Catalog of both channels; SKU panel selected on total development units | `series/run.py` |
| Recorded days by channel (vecinos sheets, receipt dates, or either) | `channel_days` |
| Settings: `channels`, `duplicate_window_days`, `receipt_tax_rate` (`series.yaml`); `structural_break` (`protocol.yaml`) | `config.py` |
| Channel carried into validation metrics and simulations; `series_by_channel` in run records | `runner/run.py`, `inventory/run.py` |
| Dashboard: channel selector in Series, Patterns, Models and Inventory; total demand by source chart | `app/dashboard.py` |
| `stage-receipts` reads only the current registration (receipts re-filed by the owner) | `audit/receipts_run.py`, `ingest/raw_registry.py` |

## Results (development span only)

| Aspect | Result |
|---|---|
| Windows | record 2024-01-03 → 2026-09-14; test 2026-03-01 → 2026-08-31 (unchanged, sealed) |
| Demand lines | vecinos 5,216 units; receipts 5,002 units (all spans); 595 receipt lines flagged as possible duplicates |
| Catalog | 2,290 SKUs over both channels (before the owner's merges) |
| SKU panel | 545 SKUs reach 80 % of development units of total demand; it contains the 300 SKUs of the previous vecinos-only panel |
| Selected series per frequency | 2,077: total 560, total_dedup 560, facturado 491, vecinos 466 (total + 14 categories + SKUs with sales in the channel) |
| Development units, monthly total series | total 9,297; vecinos 5,039; facturado 4,258; total_dedup 8,681 |
| Internal validation | weekly and monthly runs with every implemented model: 0 failures, `test_span_used: false`; weekly models took 238 s |
| Inventory simulation | weekly and monthly, every channel: 0 failures, `test_span_used: false` |

## Verification

| Check | Result |
|---|---|
| `make check` | pass, 261 tests |
| Tests in Docker (Python 3.14.9, Debian 13) | pass, 261 tests (`evidence/f2c/tests_container.txt`) |
| SonarQube on the merged code | gate passed; 0 bugs, 0 vulnerabilities, 0 code smells, coverage 98.6 % (`evidence/f2c/sonar_f2c.txt`) |
| Rebuild in the main folder after the merge | all 16 series and run tables identical to the worktree run |
| Full pipeline on the real data (in a separate worktree, so the running demo was not touched) | `build-series`, `link-prices`, validation and simulation for both frequencies completed |
| Dashboard on the new outputs (`streamlit.testing`) | 7 tabs, no exception; channel selectors present |
| Privacy | `pcs check-privacy`: no new match; outputs hold SKU ids and customer codes only |

## Pending before the freeze (F8)

- The owner's review of the catalog merges (`review_merges.md`); confirmed merges reduce the
  number of SKUs and the panel size, and the series are rebuilt.
- HE3 comparisons around the break (before/after 2025-05-01, truncated history) in F7.
