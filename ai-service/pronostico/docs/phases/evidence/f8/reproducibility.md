# Reliability tests: repeatability and reproducibility (plan 2.5.2 B)

Date: 2026-10-24. Same code, configuration and inputs; runs compared with `pcs compare-runs`.

## Repeatability of the series (`pcs build-series` run again)

All 7 outputs of `data/03_series` (calendar, catalog, panels, profile, sealed test panel) have the same SHA-256 as before the rerun. The only changed input hash is `configs/protocol.yaml`, edited in F7 (truncated-history lengths), which the series step does not use for the panels.

## Reproducibility of the experiments (second run of internal validation)

| Frequency | First run | Second run | Models | Forecasts per model | Identical | Max abs difference |
|---|---|---|---|---|---|---|
| weekly | 20261024T185612Z-weekly-validation | 20261024T194830Z-weekly-validation | 9 | 202,176 | all | 0 |
| monthly | 20261024T191817Z-monthly-validation | 20261024T195706Z-monthly-validation | 9 | 13,824 | all | 0 |
| monthly (seeds made explicit in models.yaml) | 20261024T191817Z-monthly-validation | 20261024T200051Z-monthly-validation | 9 | 13,824 | all | 0 |

Every model, including LightGBM (seeded, deterministic mode) and both Chronos variants (fine-tuning seeded), reproduces its forecasts bit for bit on the same machine, so the dispersion between executions of the stochastic models is zero. Host vs container: LightGBM differs by at most 4.4e-16 (F4 evidence); Chronos runs only on the host (the container has no PyTorch).

## Reconciliation (from the audits)

- Vecinos record: 564 of 567 daily blocks match the sheet TOTAL row; 1 differs (S/ 7,540 vs 7,380), 1 has no TOTAL row and 1 a non-numeric total (F1, `evidence/f1/audit_report.md`).
- Retail receipts: 1,151 of 1,151 reconcile with their printed totals; largest gap S/ 0.005 (F1b, rerun after the November 2024 delivery).
