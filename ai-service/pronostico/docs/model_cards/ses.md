# Model card: Simple exponential smoothing (SES)

- Identifier: `ses`
- Family: Baseline
- Code: `src/pcsforecast/models/statistical.py` `SES`
- Status: configuration declared; frozen in F8 together with `models.yaml`, `tuning.yaml` and `tuned.yaml`

## Method

Level recursion l_t = l_{t-1} + α (y_t − l_{t-1}), initialised at the first value; flat forecast. α is chosen per series and origin on the training window from the grid 0.05-0.95 (step 0.05) by the smallest in-sample one-step squared error; ties keep the smaller α.

## Basis and verification

Babai et al. (2014); plan Table 20 (α selected on internal data). Cross-checked against statsforecast `SimpleExponentialSmoothing` (differences ≤ 1.1e-13).

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
| weekly | total | 0.755 | 0.755 |
| weekly | category | 0.692 | 0.700 |
| weekly | sku | 1.214 | 0.767 |
| monthly | total | 0.534 | 0.534 |
| monthly | category | 0.554 | 0.534 |
| monthly | sku | 1.396 | 0.400 |

| Frequency | Mean fill rate (SKU, L = 1, target 95 %) | Mean stock on hand (units) | Validation run time (s) | Failed forecasts |
|---|---|---|---|---|
| weekly | 0.920 | 2.008 | 12.9 | 0 |
| monthly | 0.935 | 1.678 | 0.7 | 0 |

Results above are from internal validation on the development span (2024-01 to 2026-02) and describe the rehearsal, not the thesis results; the final test (2026-03-01 to 2026-08-31) is sealed until the freeze.

## Intended use and limitations

Intended use: comparative research on the demand series of PCSystemStore under the frozen protocol; in production (F11) only as a suggestion that a person approves (human oversight). Out of scope: causal claims, other companies without re-validation, unattended ordering.

Not designed for intermittent demand: after a sale the level jumps and decays slowly, overstating demand in zero periods.

## Risks and oversight

See the AI risk register (`docs/quality/ai_risk_register.md`). Failures are logged, never replaced by another technique (plan 2.6.3).
