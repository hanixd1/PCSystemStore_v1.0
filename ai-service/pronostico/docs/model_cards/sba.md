# Model card: Syntetos-Boylan approximation (SBA)

- Identifier: `sba`
- Family: Intermittent demand
- Code: `src/pcsforecast/models/statistical.py` `sba`
- Status: configuration declared; frozen in F8 together with `models.yaml`, `tuning.yaml` and `tuned.yaml`

## Method

Croston's estimate multiplied by (1 − α/2) to remove its bias.

## Basis and verification

Syntetos and Boylan (2005); plan Table 20. Cross-checked against statsforecast `CrostonSBA` at α = 0.1 (differences ≤ 2.3e-13). α selected by the declared search; the selection (0.3) lies on the edge of the declared grid.

## Configuration

| Frequency | Effective parameters |
|---|---|
| weekly | alpha = 0.3 |
| monthly | alpha = 0.3 |

## Inputs and data

Training window of each series up to the origin only (rolling 52 weeks / 18 months; `TrainView`, read-only). Series: total, category and SKU demand of PCSystemStore (vecinos record + delivered receipts, amendment v3), 1,728 series per frequency over four channels. No customer data reaches any model.

## Development-span results (channel total, h = 1)

Validation runs `20261024T185612Z-weekly-validation` and `20261024T191817Z-monthly-validation`; inventory runs `20261024T191017Z-weekly-inventory` and `20261024T192254Z-monthly-inventory`.

| Frequency | Level | Mean MASE | Median MASE |
|---|---|---|---|
| weekly | total | 0.731 | 0.731 |
| weekly | category | 0.644 | 0.685 |
| weekly | sku | 2.407 | 1.539 |
| monthly | total | 0.381 | 0.381 |
| monthly | category | 0.508 | 0.537 |
| monthly | sku | 2.751 | 1.352 |

| Frequency | Mean fill rate (SKU, L = 1, target 95 %) | Mean stock on hand (units) | Validation run time (s) | Failed forecasts |
|---|---|---|---|---|
| weekly | 0.919 | 2.597 | 0.4 | 0 |
| monthly | 0.935 | 2.917 | 0.1 | 0 |

Results above are from internal validation on the development span (2024-01 to 2026-02) and describe the rehearsal, not the thesis results; the final test (2026-03-01 to 2026-08-31) is sealed until the freeze.

## Intended use and limitations

Intended use: comparative research on the demand series of PCSystemStore under the frozen protocol; in production (F11) only as a suggestion that a person approves (human oversight). Out of scope: causal claims, other companies without re-validation, unattended ordering.

Same late reaction to obsolescence as Croston.

## Risks and oversight

See the AI risk register (`docs/quality/ai_risk_register.md`). Failures are logged, never replaced by another technique (plan 2.6.3).
