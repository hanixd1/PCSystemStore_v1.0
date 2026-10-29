# F3 - Rolling-origin engine, baseline and intermittent models

- Date: 2026-10-21
- Plan phase: none on its own (implements the machinery of phases 3-4, run on development data)
- Inputs consumed: `data/03_series` as recorded in `evidence/f2/manifest_03_series.json`.

## Goal

An end-to-end, paired evaluation on internal-validation origins: every model sees the same series,
origins, training windows and horizons, with scaled errors per origin - before any complex model
is added.

## Delivered

| Item | Location |
|---|---|
| `Forecaster` interface: a model receives only a read-only `TrainView` (values up to the origin) | `models/base.py`, `protocol/origins.py` |
| Naive, SES (alpha chosen on the training window), Croston, SBA, TSB in NumPy | `models/statistical.py`, ADR-0004 |
| Registry from `configs/models.yaml`; families not implemented yet are reported, never substituted | `models/registry.py` |
| Internal-validation origins (Table 17): rolling window 52 weeks / 18 months, horizons 1 and 4 weeks / 1 month; every target inside the development span | `protocol/origins.py` |
| Seal guard: the test span can only be opened with a frozen `FREEZE.json` | `protocol/origins.py` |
| Engine: paired evaluation, per-model timing, failures logged without stopping the run | `runner/engine.py` |
| MAE, RMSE, bias, cumulative bias, MASE and RMSSE with the in-sample naive scale of each origin (undefined → NaN, never replaced), RelMAE vs naive | `evaluation/metrics.py` |
| `pcs run-validation --frequency weekly|monthly`: `outputs/runs/<id>/predictions.parquet`, `metrics.parquet`, `run.json` (config hashes, versions, hardware, timings, failures, `test_span_used: false`) | `runner/run.py` |
| Read-only dashboard (Streamlit): summary, data-quality audit, series explorer, demand patterns, model leaderboard; development span only | `app/dashboard.py`, `reporting/dashboard_data.py`, `make dashboard` |

## Results (internal validation, development span only)

Details: `evidence/f3/validation_summary.md`. These are **not** final-test results and are not
used to choose anything yet.

- Weekly: 315 series (total, 14 categories, 300 SKUs), 60 origins, 5 models, 0 failures, ~3 s.
- Monthly: 315 series, 8 origins, 0 failures.
- At SKU level the naive model has the lowest median MASE because most targets and most forecasts
  are zero - the known weakness of MASE on intermittent demand that the plan addresses with the
  inventory measures (OE2).

## Verification

| Check | Result | Evidence |
|---|---|---|
| `make check` | 173 tests pass; coverage 99 % | `evidence/f3/tests_host.txt` |
| Tests in Docker | 173 pass | `evidence/f3/tests_container.txt` |
| Hand-computed checks for every model and metric; a spy model proves no value after the origin reaches a model; read-only training views | pass | `tests/unit/test_models_protocol.py` |
| Integration F1 → F3 on a synthetic year, dashboard data loaded from the outputs | pass | `tests/integration/test_f2_f3_pipeline.py` |
| Host vs container on the real record | predictions and metrics identical | `evidence/f3/host_container_equivalence.txt` |
| SonarQube | gate passed after fixing 3 findings (regex backtracking, duplicated literal, exception test); `app/` analysed, UI excluded from coverage only | `evidence/f3/sonar_f3.txt` |

## Deviations

- Statistical and intermittent models are own NumPy implementations instead of statsforecast
  (ADR-0004).
- Hyperparameters of Croston, SBA and TSB are fixed at the declared 0.1 for now; the plan's search
  on internal origins is added before the freeze (F8).
- The dashboard (planned for F7) was brought forward in a minimal read-only form for the
  presentation.

## Handoff

Next: protocol amendment for the channel break (plan v3), machine-learning models (F4), inventory
simulation (F6).
