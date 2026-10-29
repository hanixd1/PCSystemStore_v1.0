# Model card: Two-stage gradient-boosted trees

- Identifier: `two_stage_trees`
- Family: Machine learning
- Code: `src/pcsforecast/models/gbm.py` `TwoStageGBM`, `src/pcsforecast/features/lagged.py`
- Status: configuration declared; frozen in F8 together with `models.yaml`, `tuning.yaml` and `tuned.yaml`

## Method

Pooled across series without identity: a LightGBM classifier estimates P(sale) and a LightGBM regressor the size given a sale; forecast = P × size, rescaled by the series' training mean. Direct multi-horizon design with features known at the origin: lags 1-4, rolling means 4/8/13, occurrence share over 8 periods, periods since the last sale, mean size, horizon. Retrained at every origin; fixed seed, deterministic mode, 2 threads.

## Basis and verification

Fu et al. (2026); plan Table 20 and Figure 10; ADR-0005. Hyperparameters selected by the declared search (ADR-0010).

## Configuration

| Frequency | Effective parameters |
|---|---|
| weekly | learning_rate = 0.03, min_data_in_leaf = 50, num_leaves = 31, rounds = 200 |
| monthly | learning_rate = 0.05, min_data_in_leaf = 50, num_leaves = 15, rounds = 100 |

## Inputs and data

Training window of each series up to the origin only (rolling 52 weeks / 18 months; `TrainView`, read-only). Series: total, category and SKU demand of PCSystemStore (vecinos record + delivered receipts, amendment v3), 1,728 series per frequency over four channels. No customer data reaches any model.

## Development-span results (channel total, h = 1)

Validation runs `20261024T185612Z-weekly-validation` and `20261024T191817Z-monthly-validation`; inventory runs `20261024T191017Z-weekly-inventory` and `20261024T192254Z-monthly-inventory`.

| Frequency | Level | Mean MASE | Median MASE |
|---|---|---|---|
| weekly | total | 1.400 | 1.400 |
| weekly | category | 0.841 | 0.808 |
| weekly | sku | 10.630 | 1.370 |
| monthly | total | 1.544 | 1.544 |
| monthly | category | 1.097 | 1.132 |
| monthly | sku | 3.683 | 0.785 |

| Frequency | Mean fill rate (SKU, L = 1, target 95 %) | Mean stock on hand (units) | Validation run time (s) | Failed forecasts |
|---|---|---|---|---|
| weekly | 0.946 | 2.530 | 125.4 | 0 |
| monthly | 0.956 | 2.413 | 4.1 | 0 |

Results above are from internal validation on the development span (2024-01 to 2026-02) and describe the rehearsal, not the thesis results; the final test (2026-03-01 to 2026-08-31) is sealed until the freeze.

## Intended use and limitations

Intended use: comparative research on the demand series of PCSystemStore under the frozen protocol; in production (F11) only as a suggestion that a person approves (human oversight). Out of scope: causal claims, other companies without re-validation, unattended ordering.

Highest error (mean MASE) of all models at SKU level, driven by large errors on a few series, but the highest fill rate in the inventory simulation: an example of the accuracy/service divergence studied in HE2. Falls back to the training mean when fewer than 10 training rows exist.

## Risks and oversight

See the AI risk register (`docs/quality/ai_risk_register.md`). Failures are logged, never replaced by another technique (plan 2.6.3).
