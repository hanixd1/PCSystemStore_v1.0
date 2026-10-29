# ADR-0010: Hyperparameter search on internal origins with a declared budget

- Status: accepted
- Date: 2026-10-24

## Context

Plan 2.6.3 requires that hyperparameters "se elegirán en orígenes internos anteriores a la prueba,
con un presupuesto de búsqueda declarado", and Table 20 says that the SES alpha and the TSB alpha
and beta are selected on internal validation. Until now Croston, SBA, TSB and both gradient
boosting models ran with fixed declared values (F3, F4). The selection must not look at the
sealed final test, and its cost must stay within a laptop's budget (risk R4).

## Decision

- `configs/tuning.yaml` declares, per model, a grid and a **budget** (maximum candidates, the
  declared configuration of `models.yaml` included), the tuning origins (every `origin_stride`-th
  development origin: 15 of 60 weekly, all 8 monthly), the metric (mean MASE) and the channel that
  scores the candidates (`total`, the primary series of amendment v3).
- Candidate 0 is always the declared configuration; the other candidates are the grid product, or a
  seeded sample of it in grid order when the product exceeds the budget. Ties keep the earlier
  candidate, and a candidate with any failed forecast is not eligible.
- Candidates are evaluated by the same engine, window, horizons and panel as internal validation
  (panel models are trained on all channels, as in validation). Only `panel_development.parquet`
  is read.
- `pcs tune` writes every candidate's score to `outputs/tuning/<run>/` and the selection to
  `configs/tuned.yaml` (generated, hashed in every later run record, frozen in F8). The registry
  merges, in order of precedence: `tuned.yaml`, `params_by_frequency` and `params` of
  `models.yaml`. Each run record now lists the effective parameters of every model.
- Not searched: Naive (no parameters), SES (alpha chosen per series and origin on the training
  window, as before), both Chronos variants (published weights; fine-tuning settings declared,
  ADR-0011).

## Consequences

- The search is reproducible from `tuning.yaml` and the seed, and its full cost is recorded.
- Internal-validation results of tuned models are now in-sample with respect to the selection
  (the tuning origins are a subset of the validation origins); the unbiased comparison is the
  final test (F9), opened once after the freeze. This is stated in the F7 rehearsal tables.
- The budget is small (5 to 16 candidates per model); a larger search would need a new declaration
  before F8.
