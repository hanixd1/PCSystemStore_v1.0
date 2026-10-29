# Model card: Naive (last observed value)

- Identifier: `naive`
- Family: Baseline
- Code: `src/pcsforecast/models/statistical.py` `Naive`
- Status: configuration declared; frozen in F8 together with `models.yaml`, `tuning.yaml` and `tuned.yaml`

## Method

The forecast for every horizon is the last value of the training window. It is the benchmark of every relative measure (RelMAE, Diebold-Mariano pairs) and the scale of MASE/RMSSE (in-sample one-step naive error).

## Basis and verification

Hyndman (2006); plan Table 20.

## Configuration

| Frequency | Effective parameters |
|---|---|
| weekly | none (no parameters, or chosen per series and origin) |
| monthly | none (no parameters, or chosen per series and origin) |

## Inputs and data

Training window of each series up to the origin only (rolling 52 weeks / 18 months; `TrainView`, read-only). Series: total, category and SKU demand of PCSystemStore (vecinos record + delivered receipts, amendment v3), 1,728 series per frequency over four channels. No customer data reaches any model.

## Development-span results (channel total, h = 1)

Validation runs `20261024T185612Z-weekly-validation` and `20261024T191817Z-monthly-validation`; inventory runs `20261024T191017Z-weekly-inventory` and `20261024T192254Z-monthly-inventory`.

| Frequency | Level | Mean MASE | Median MASE |
|---|---|---|---|
| weekly | total | 0.787 | 0.787 |
| weekly | category | 0.812 | 0.820 |
| weekly | sku | 1.263 | 0.663 |
| monthly | total | 0.419 | 0.419 |
| monthly | category | 0.607 | 0.611 |
| monthly | sku | 1.266 | 0.000 |

| Frequency | Mean fill rate (SKU, L = 1, target 95 %) | Mean stock on hand (units) | Validation run time (s) | Failed forecasts |
|---|---|---|---|---|
| weekly | 0.906 | 2.210 | 0.2 | 0 |
| monthly | 0.900 | 1.351 | 0.0 | 0 |

Results above are from internal validation on the development span (2024-01 to 2026-02) and describe the rehearsal, not the thesis results; the final test (2026-03-01 to 2026-08-31) is sealed until the freeze.

## Intended use and limitations

Intended use: comparative research on the demand series of PCSystemStore under the frozen protocol; in production (F11) only as a suggestion that a person approves (human oversight). Out of scope: causal claims, other companies without re-validation, unattended ordering.

Reacts fully to the last period: a single sale in an otherwise empty week is projected forward, and a zero is projected after any sale. Its median MASE of 0 at monthly SKU level reflects many all-zero windows (zero forecasts, zero errors), not skill.

## Risks and oversight

See the AI risk register (`docs/quality/ai_risk_register.md`). Failures are logged, never replaced by another technique (plan 2.6.3).
