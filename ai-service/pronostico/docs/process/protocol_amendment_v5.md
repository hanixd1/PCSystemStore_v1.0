# Protocol amendment v5 - owner-corrected sheet dates in the test span

- Date: 2026-10-27, after the single opening of the frozen final test (F9, 2026-10-26).
- Decided by: the researcher (owner of PCSystemStore). The corrections come from the company's
  sales records, not from any forecast or result.
- Status: a declared re-evaluation. The frozen results (`v1.0.0-research-freeze`, opening at
  commit `2786a20`) stay the primary results; the corrected ones are reported next to them.
- Code and data: branch `amendment/v5-corrected-dates`, tag `v1.1.0-amendment-v5`, run in a
  separate clone so that the frozen data and outputs were never overwritten.
- Plan document: `Documentacion/Plan tesis v6.docx` (tracked changes by "Enmienda v5").

## What the company corrected

Low sales in 2026 left few vecinos daily sheets, each covering several days. Copies of a sheet
("13-05-26 (4)") were dated by the rule for copies (consecutive days, medium confidence). After
the opening, the owner gave the real dates in the delivered workbook and revised three sheets.

| Sheet in the frozen workbook | Date inferred | Date confirmed |
|---|---|---|
| 13-03-26 (2), 25-03-26 (2), 13-04-26 (2), 22-08-2026 (2) | 14 Mar, 26 Mar, 14 Apr, 23 Aug | same days (renamed) |
| 13-04-26 (3), 13-04-26 (4) | 15, 16 Apr | 17, 21 Apr |
| 13-05-26 (2), 13-05-26 (3) | 14, 15 May | 20, 27 May |
| 13-05-26 (4), 13-05-26 (5) | 16, 17 May | 3, 20 Jun |
| 20-07-26 | 20 Jul | 10 Jul |
| 14-09-2026 | 14 Sep | removed (September is outside the analysis) |

Contents of three sheets were also revised (17-04-26, 22-08-2026, 23-08-2026). Test-span units
by month (channel total) change only in May (124 to 112) and June (46 to 58). The total of the
test span is unchanged at 755 units.

## Changes

- `configs/protocol.yaml`: `final_test.record_end: 2026-08-31`. The corrected record ends with the
  sheet of 23 August; the declared end keeps the test window at 2026-03-01..2026-08-31, as in the
  plan (Table 17). Code support: `final_test.record_end`, optional, commit `982e07c` on `main`.
- Data: the corrected workbook. The receipts are the 1,151 registered at the freeze, copied from
  `data/00_raw`, so that the 46 September receipts later removed from `datos/` do not change the
  catalog.

## What does not change

- Models, hyperparameters (`tuned.yaml`), the inventory policy and the statistical tests.
- The 442 selected SKUs and every development value of the selected series. The development
  validation forecasts of the nine models are identical
  (`amendment/v5-corrected-dates:docs/phases/evidence/amendment_v5/development_identical.md`).
- The 52 series that left the catalog are SKUs sold only in September, never selected, with zero
  development units.

## Results

`docs/phases/evidence/amendment_v5_comparison.md` compares both openings. Every hypothesis
decision is the same. The main changes are small:
- weekly total MASE of fine-tuned Chronos: 0.851 to 0.814;
- monthly categories at 3 months: fine-tuned Chronos replaces SBA as the best mean rank;
- Spearman strata with the upper bound below 0.5: 20 to 19 of 24;
- HE3 strata rejecting: 53 to 54 of 64.

Panel-trained models (global GBM, two-stage trees, fine-tuned Chronos) learn from every channel,
so their facturado forecasts move slightly although the facturado data did not change. The
statistical models give identical facturado forecasts.

Article and thesis tables of the corrected opening: `docs/article/evidence_tables_amendment_v5.md`,
`docs/thesis/results_tables_amendment_v5.md`.
