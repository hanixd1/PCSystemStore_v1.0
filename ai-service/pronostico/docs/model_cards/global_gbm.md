# Model card: Global gradient-boosting model

- Identifier: `global_gbm`
- Family: Machine learning
- Code: `src/pcsforecast/models/gbm.py` `GlobalGBM`, `src/pcsforecast/features/lagged.py`
- Status: configuration declared; frozen in F8 together with `models.yaml`, `tuning.yaml` and `tuned.yaml`

## Method

One LightGBM regressor with Tweedie loss (variance power 1.5) over the whole panel, with the series identifier as a categorical feature and the same features as the two-stage model. Retrained at every origin on all channels' series; fixed seed, deterministic mode.

## Basis and verification

Montero-Manso and Hyndman (2021); plan Table 20 and Figure 11; ADR-0005. Hyperparameters selected by the declared search (31 leaves and 200 rounds lie on the edge of the declared grid).

## Configuration

| Frequency | Effective parameters |
|---|---|
| weekly | learning_rate = 0.05, min_data_in_leaf = 50, num_leaves = 31, rounds = 200 |
| monthly | learning_rate = 0.05, min_data_in_leaf = 50, num_leaves = 31, rounds = 200 |

## Inputs and data

Training window of each series up to the origin only (rolling 52 weeks / 18 months; `TrainView`, read-only). Series: total, category and SKU demand of PCSystemStore (vecinos record + delivered receipts, amendment v3), 1,728 series per frequency over four channels. No customer data reaches any model.

## Development-span results (channel total, h = 1)

Validation runs `20261024T185612Z-weekly-validation` and `20261024T191817Z-monthly-validation`; inventory runs `20261024T191017Z-weekly-inventory` and `20261024T192254Z-monthly-inventory`.

| Frequency | Level | Mean MASE | Median MASE |
|---|---|---|---|
| weekly | total | 1.130 | 1.130 |
| weekly | category | 0.772 | 0.772 |
| weekly | sku | 1.059 | 0.662 |
| monthly | total | 1.157 | 1.157 |
| monthly | category | 0.860 | 0.935 |
| monthly | sku | 2.062 | 0.351 |

| Frequency | Mean fill rate (SKU, L = 1, target 95 %) | Mean stock on hand (units) | Validation run time (s) | Failed forecasts |
|---|---|---|---|---|
| weekly | 0.936 | 2.146 | 124.2 | 0 |
| monthly | 0.936 | 1.795 | 5.4 | 0 |

Results above are from internal validation on the development span (2024-01 to 2026-02) and describe the rehearsal, not the thesis results; the final test (2026-03-01 to 2026-08-31) is sealed until the freeze.

## Intended use and limitations

Intended use: comparative research on the demand series of PCSystemStore under the frozen protocol; in production (F11) only as a suggestion that a person approves (human oversight). Out of scope: causal claims, other companies without re-validation, unattended ordering.

Training on the whole panel makes each series' forecast depend on the others; panel composition is fixed before the test (amendment v3, D5).

## Risks and oversight

See the AI risk register (`docs/quality/ai_risk_register.md`). Failures are logged, never replaced by another technique (plan 2.6.3).
