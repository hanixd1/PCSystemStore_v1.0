# F4 - Machine-learning models (LightGBM)

- Date: 2026-10-21
- Plan phase: none on its own (Table 20 machine-learning family; run on development data)
- Inputs consumed: `data/03_series` as recorded in `evidence/f2/manifest_03_series.json`.

## Goal

Add the two machine-learning configurations of Table 20 to the same paired evaluation and to the
inventory simulation, without any information after the origin reaching the models.

## Delivered

| Item | Location |
|---|---|
| Time-safe features from one history at a time (lags 1-4, means 4/8/13, occurrence share, periods since last sale, mean size, horizon), scaled by the history mean; direct multi-horizon design | `features/lagged.py` |
| `PanelForecaster` interface (all series' histories cut at the same origin) | `models/base.py` |
| Two-stage LightGBM (occurrence × size, pooled) and global LightGBM (Tweedie, series code) | `models/gbm.py`, ADR-0005 |
| One forecast-path function for local and panel models, used by the engine and the simulator; failures logged per origin | `runner/paths.py`, `runner/engine.py`, `inventory/run.py` |
| Dashboard labels for the new models | `app/dashboard.py` |

## Results (internal validation, development span only - not final-test results)

Details: `evidence/f4/summary.md`.

- Weekly: 7 models × 315 series × 60 origins, 0 failures; two-stage 24 s, global 20 s.
- SKU level, horizon 4: the global LightGBM has the best mean rank (2.38) and beats the naive model
  on 44 % of SKUs; at horizon 1 the naive model keeps the best mean rank because most targets are
  zero (MASE limitation on intermittent demand).
- Category and total level: the statistical methods (SES, SBA, TSB) rank ahead of both LightGBM
  models.
- Inventory, weekly primary scenario: see the summary; simulation results are reproduced exactly
  in the container.

## Verification

| Check | Result | Evidence |
|---|---|---|
| Features by hand; targets inside the history; property test that values after the position never change the features | pass | `tests/unit/test_features_gbm.py` |
| LightGBM models: every series forecast, non-negative, deterministic on repeat, fallbacks (tiny panel, constant occurrence, no sales), invalid histories refused | pass | same |
| Panel failures logged per origin; series must share the calendar | pass | same |
| Integration F1 → F6 with 7 models on a synthetic year | pass | `tests/integration/test_f2_f3_pipeline.py` |
| `make check` / Docker | 200 tests pass in both; coverage 98.7 % | `evidence/f4/tests_*.txt` |
| Host vs container on the real record | inventory simulations identical; 110 of 257,985 weekly predictions (only LightGBM) differ by ≤ 4.4e-16; metrics ≤ 1.8e-15; not rounded | `evidence/f4/host_container_equivalence.txt` |
| SonarQube | gate passed after fixing 1 finding (exception test) | `evidence/f4/sonar_f4.txt` |

## Deviations

- Both models are trained across the panel (ADR-0005): per-series tree models are not viable with
  the number of sales per SKU.
- Hyperparameters are fixed and declared; the search on internal origins is added before F8.
- The container stays the reference platform for reported numbers; host differences are at the
  last floating-point digit and are reported, not rounded.
