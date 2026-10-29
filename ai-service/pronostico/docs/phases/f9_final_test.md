# F9 - Single opening of the final test

- Date: 2026-10-26
- Plan phase: 4 (final test, opened once), Table 17, sections 2.6.4-2.6.6.
- Inputs: the frozen configuration (`FREEZE.json`, tag `v1.0.0-research-freeze`, commit
  `fc96b66`), the sealed test panel (SHA-256 `3ac3bb6d…`, as recorded at the freeze) and the
  final-test harness (ADR-0012, commit `2786a20`).
- Status: **done**. The test was opened once: one attempt, completed, no failures.

## Procedure

1. **Harness** (ADR-0012), added after the freeze and before the opening.
   - Development runs repeated with the harness are identical to the runs of the freeze
     (`evidence/f9/regression.md`).
   - Docker: 313 tests pass, 1 skipped. SonarQube gate passed (0 issues, coverage 98.2 %).
2. **Rehearsal** on the development span, with 2025-09-01 to 2026-02-28 standing in for the test:
   8 runs and 2 statistics, no failures, `test_span_used = false`.
3. **Opening** with `scripts/open_test.sh` at commit `2786a20`, from 21:58 to 22:40 UTC
   (`evidence/f9/test_opened.json`).
   - `pcs freeze --check` was green just before.
   - The opening was recorded before the sealed panel was read.

| Run | Origins | Target periods | Forecasts | Failures |
|---|---|---|---|---|
| Weekly: primary, truncated, expanding | 29 | 2026-03-02 to 2026-08-24 (26 weeks) | 808,704 each | 0 |
| Monthly: primary, truncated, expanding (incl. 3-month sensitivity) | 8 | 2026-03 to 2026-08 (6 months) | 186,624 each | 0 |
| Weekly and monthly inventory | calibration on the development origins, evaluation on the test | test periods | - | 0 |

The article tables with the final-test results are in `docs/article/evidence_tables_final_test.md`.
The development-span tables (`docs/article/evidence_tables.md`) are kept for comparison.

## Results (channel: total demand)

Notes on reading the tables:
- MASE is undefined when the training window has no variation (scale 0). Those series are
  reported as missing, never replaced.
- For this reason SKU-level means and Friedman tests use the series with a defined MASE: 279 of
  the weekly SKU series at h = 1, 288 at h = 4.

### Accuracy (HE1)

- **Friedman rejects equal performance in every stratum** (weekly and monthly; category and SKU;
  every horizon), with p ≤ 2.5e-7.
- **Category level:** fine-tuned Chronos has the best mean rank in every weekly horizon (1.07 at
  h = 1). The Nemenyi critical difference is 3.21, which separates it from the gradient-boosting
  models and the naive. Monthly: fine-tuned Chronos is best at h = 1, and SBA is best at the 3-month
  sensitivity horizon.
- **SKU level:** the naive has the best mean rank (2.23 weekly at h = 1), followed by fine-tuned
  Chronos (3.01). Most SKU series are intermittent: a naive forecast of zero is often exactly
  right, while Croston and SBA, which forecast a positive rate, rank last.
- **Mean weekly SKU MASE** (h = 1), which counts the size of the errors and not only their order:
  - fine-tuned Chronos: 0.18;
  - zero-shot Chronos: 0.23;
  - global GBM: 0.30;
  - TSB: 0.32;
  - naive: 0.33.
- **Diebold-Mariano** (squared loss, per series, Holm):
  - Weekly and monthly at h = 1, no predefined model beats the naive on any series. At the
    monthly 3-month sensitivity horizon, SES, SBA and TSB beat it on 4, 1 and 2 series.
  - Weekly at h = 1, the naive is better on 46-90 series against SES, Croston, SBA and both
    Chronos models, and on none against TSB.
  - Fine-tuned Chronos beats zero-shot on 9 series at h = 1 and 18 at h = 4; the reverse occurs on
    2 and 0.

### Inventory (HE2)

- **Monthly:** the ranking by MASE and the ranking by fill rate move in opposite directions.
  - The Spearman correlation is negative at every level: category −0.58 (95 % CI −0.88 to
    −0.22), SKU −0.45 (−0.65 to −0.07), total −0.76.
  - Every interval lies entirely below 0.
- **Weekly:** the correlation is also negative (category −0.21, SKU −0.41, total −0.42), but the
  category and SKU intervals include 0.
- **Weekly total series** (primary scenario: L = 1, target 95 %):
  - every model reached the target on the development origins;
  - on the test only the naive held it, with a fill rate of 0.97, but with about twice the mean
    stock of the others;
  - the other models fell to 0.82-0.91. Fine-tuned Chronos, the most accurate at this level, had
    0.85.
- **SKU level:** fill rates of 0.98-0.99 for every model. Lost-sales value ranges from S/ 5,446
  (SES) to S/ 9,486 (two-stage trees) weekly, at the price known at each origin.

### Robustness (HE3)

- The truncated history and the expanding window change MASE differently across models (Friedman):
  - in every weekly stratum, with p ≤ 1e-4;
  - at monthly SKU level and at the monthly category level at 3 months (p ≤ 0.031);
  - but not at the monthly category level at 1 month (p = 0.18 truncated, 0.53 expanding).
- The break contrast does not apply to the test, because the whole test lies after the 2025-05-01
  break. Its evidence is the development span (F7).

## Reading for the article

- The final test reproduces the development pattern, now out of sample:
  - the foundation model fine-tuned on the company's own series is the most accurate on
    aggregated series (categories, total);
  - the most accurate model is not the one that serves best;
  - with squared loss, almost no model beats the naive series by series.
- **HE2 is supported most clearly by the monthly series.** At weekly frequency the direction is
  the same, but the evidence is weaker.
- **The weekly total shows the risk of a fixed safety-stock multiplier.** The multiplier was
  calibrated to reach 95 % on the development span and fell short on the test for every model
  except the naive. Report this as a limitation and a practical lesson; it is not a reason to
  recalibrate. Recalibrating on the test is not allowed.

## Decisions and deviations

- **Harness added after the freeze** (ADR-0012). The opening is tied to commit `2786a20`, after
  the freeze commit `fc96b66`. No model, parameter, rule or datum changed, and the regression
  proves the development results identical.
- **Inventory calibration on the test.** The multiplier is calibrated on every
  internal-validation origin (plan 2.6.5), not on the first half used in the F6 rehearsal.
- **After the opening**, `pcs freeze --check` reports `test_span_unused` as failed, by design
  (`evidence/f9/freeze_check_after_opening.txt`). A second opening is refused.

## Next steps

- F10: write the results and discussion of the article from
  `docs/article/evidence_tables_final_test.md`, and declare the ADR-0012 deviation.
