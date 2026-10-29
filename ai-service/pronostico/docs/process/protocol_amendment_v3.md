# Protocol amendment v3 (thesis plan v2 → v3)

- Date: 2026-10-23, before the final test span is opened (it stays sealed in
  `data/03_series/sealed/`; no model has been evaluated on it).
- Scope: data sources, channel scope, treatment of unrecorded periods, structural break, catalog
  freeze and inventory valuation. Objectives, hypotheses, model families, metrics, statistical
  tests and the test window are **unchanged**.
- Evidence used: record coverage (which periods have sheets or receipts), development-span volumes
  (before 2026-03-01) and the owner's answers (`company_clarifications.md`, 2026-10-21 to
  2026-10-23). Internal-validation errors were **not** used for any decision below.

## Why an amendment

Plan v2 was written before the records were audited. The audit (F1, F1b, F2b) found:

| Fact | Source |
|---|---|
| The vecinos record drops from about 250 lines a month (2024) to about 40 (2026); confirmed real by the owner (component shortage, stock sent to final customers) | F1 audit, clarifications 2026-10-21 |
| Weeks without any vecinos sheet: 2 of 112 in development, **17 of 26 in the final-test span**; monthly: 0 of 26 and 1 of 6 | coverage of `calendar.parquet` |
| Retail receipts of both RUCs exist for 2024-01 to 2026-09: 1,116 receipts, 4,771 units; weeks without receipts: 2 of 112 in development, 1 of 26 in the test span | F1b |
| About one in three receipt numbers is missing; the owner confirmed those receipts were lost and their sales are written in the vecinos record | F1b, clarifications 2026-10-23 |
| No factura of November 2024 was delivered (the owner can obtain them) | F1b |
| Development span: the vecinos share of units falls from about 0.6 (2024) to 0.3-0.5 from May 2025 onwards; the owner dates the shortage to May 2025 | development volumes, clarifications 2026-10-23 |
| Development span: 525 retail lines have a vecinos line with the same SKU and quantity within 3 days, against 281 when the vecinos dates are shifted 60 days (chance level): about 240 lines (~7 % of retail units) may be one sale recorded in both | development data only |
| Product texts differ between and within channels; a current price list links 30 % of units to real products and proposes 117 SKU merges | F2b |

With the vecinos record alone, the weekly test span would be mostly empty, and the "channel
composition change" of OE3 could not be measured. Plan v2 already foresaw both channels
(sections 1.1.2-B, 1.1.7-C, 2.4.1); this amendment fixes how they are used.

## Decisions

### D1 - Channels and the main demand series (plan 1.1.7-C, 2.4.3, 2.6.2)

- **Primary series: total demand** = units of valid sales in the vecinos record (`sale_paid`,
  `sale_credit`) + units of valid delivered receipts. The vecinos record also carries the sales whose
  receipts were lost, so both sources are needed for the total.
- **Secondary series: each channel separately** - "vecinos record" and "delivered receipts" - for
  OE1 (accuracy by channel) and OE3 (channel composition).
- **Sensitivity: deduplicated total**, removing each receipt line that has a vecinos line with the
  same SKU and quantity within ±3 days (an upper bound of the double counting; it also removes
  chance coincidences).
- The unit of analysis becomes product or category × channel (total, vecinos, receipts) ×
  frequency.

### D2 - Unrecorded periods (plan 2.6.2)

- Vecinos: a period without any sheet is a **confirmed zero** (owner, 2026-10-23), which is the
  reconciliation plan v2 requires before treating an absent sheet as no sale.
- Receipts: a period without receipts is a zero (receipts are the complete delivered record).
- November 2024 facturas: delivered and ingested before the freeze; if they cannot be, November
  2024 stays flagged as incomplete for the receipts channel and the total, reported, not imputed.

### D3 - Test window and study period (plan 1.1.7-A, Table 17)

- **Unchanged**: final test = target dates in the last six complete months, 2026-03-01 to
  2026-08-31, for every channel and frequency. It cannot move earlier without using a span already
  seen in internal validation.
- Data after 2026-08-31 (vecinos sheets to 2026-09-14, receipts to 2026-09-30) are outside the study
  windows and are not used.
- Table 17 values (minimum training, horizons, windows, origin step) are unchanged.

### D4 - Structural break (plan 2.6.2, HE3, Table 14)

- Break date: **2025-05-01** (owner's dating of the component shortage, consistent with the
  development-span channel shares; fixed without any test-span error).
- HE3 "after the break" compares, per family, the error of origins whose targets fall before and
  after 2025-05-01 within internal validation, and the test span (entirely after the break); the
  truncated-history condition trains only on periods from 2025-05-01 onwards.

### D5 - SKU panel (plan 2.4.2)

- The panel is re-selected on **total demand**: the smallest set of SKUs that accumulates 80 % of
  development-span units of both channels, after the catalog freeze (D6), with the 70 % and 90 %
  sensitivity of plan v2. The same panel is used for every channel, so comparisons stay paired.

### D6 - Catalog freeze (plan 2.5.2, Table 18)

- Before F8, the owner reviews the merge proposals (`review_merges.md`); confirmed merges go to
  `configs/catalog.yaml`, then catalog, links and panel are frozen with their hashes. Unconfirmed
  proposals are not applied.
- Retail descriptions use the same SKU keys as the vecinos texts (serial numbers removed).

### D7 - Valuation of lost sales (Table 21)

- Primary valuation unchanged (price known at the origin). Added sensitivities: list price for lost
  units without a price (`lost_value_list_fill`) and every lost unit at the current list price
  (`lost_value_at_list`). Prices are a 2026-10 neighbour list; final-customer prices are somewhat
  higher (owner).

## What does not change

Objectives OE1-OE3, hypotheses HG, HE1-HE3 and Table 14, model families (Table 20), metrics
(MASE, RMSSE, bias, RelMAE), the rolling-origin protocol and fairness rule (Table 17), the
inventory policy and scenarios (Table 21 apart from D7), significance level and Holm adjustment,
and the single opening of the test span after the F8 freeze.

## Consequences for the system (next steps)

1. Ingest the November 2024 facturas when delivered (`pcs register-raw`, `stage-receipts`,
   `audit-receipts`).
2. Apply the owner-confirmed catalog merges.
3. Rebuild the series per channel (total, vecinos, receipts; deduplicated sensitivity) and the SKU
   panel on total demand; keep the test span sealed.
4. Re-run internal validation, LightGBM and the inventory simulation on the new series; add the
   break-based HE3 comparisons.
5. Update `configs/protocol.yaml` and `configs/series.yaml` with D1-D5, so the amendment is part of
   the configuration hashes frozen in F8.
6. Reflect the amendment in the thesis plan document (`Plan ts v3.docx`): sections 1.1.2-B, 1.1.7,
   1.1.9, 2.4, 2.5, 2.6.2, Tables 17, 18 and 21.
