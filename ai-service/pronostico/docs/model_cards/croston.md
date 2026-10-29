# Model card: Croston

- Identifier: `croston`
- Family: Intermittent demand
- Code: `src/pcsforecast/models/statistical.py` `Croston`
- Status: configuration declared; frozen in F8 together with `models.yaml`, `tuning.yaml` and `tuned.yaml`

## Method

Demand sizes z and inter-demand intervals p are smoothed only when a sale occurs, with a common α; forecast z/p, flat. Initialisation: first positive demand and its position + 1 (declared).

## Basis and verification

Croston (1972); plan Table 20. Cross-checked against statsforecast `CrostonClassic` at α = 0.1 (differences ≤ 2.3e-13). α selected by the declared search (ADR-0010).

## Configuration

| Frequency | Effective parameters |
|---|---|
| weekly | alpha = 0.15 |
| monthly | alpha = 0.2 |

## Inputs and data

Training window of each series up to the origin only (rolling 52 weeks / 18 months; `TrainView`, read-only). Series: total, category and SKU demand of PCSystemStore (vecinos record + delivered receipts, amendment v3), 1,728 series per frequency over four channels. No customer data reaches any model.

## Development-span results (channel total, h = 1)

Validation runs `20261024T185612Z-weekly-validation` and `20261024T191817Z-monthly-validation`; inventory runs `20261024T191017Z-weekly-inventory` and `20261024T192254Z-monthly-inventory`.

| Frequency | Level | Mean MASE | Median MASE |
|---|---|---|---|
| weekly | total | 0.769 | 0.769 |
| weekly | category | 0.686 | 0.705 |
| weekly | sku | 2.660 | 1.661 |
| monthly | total | 0.938 | 0.938 |
| monthly | category | 0.768 | 0.771 |
| monthly | sku | 3.023 | 1.454 |

| Frequency | Mean fill rate (SKU, L = 1, target 95 %) | Mean stock on hand (units) | Validation run time (s) | Failed forecasts |
|---|---|---|---|---|
| weekly | 0.920 | 2.775 | 0.4 | 0 |
| monthly | 0.938 | 3.210 | 0.1 | 0 |

Results above are from internal validation on the development span (2024-01 to 2026-02) and describe the rehearsal, not the thesis results; the final test (2026-03-01 to 2026-08-31) is sealed until the freeze.

## Intended use and limitations

Intended use: comparative research on the demand series of PCSystemStore under the frozen protocol; in production (F11) only as a suggestion that a person approves (human oversight). Out of scope: causal claims, other companies without re-validation, unattended ordering.

Known positive bias (Syntetos and Boylan, 2005); no update in periods without sales, so obsolescence is detected late.

## Risks and oversight

See the AI risk register (`docs/quality/ai_risk_register.md`). Failures are logged, never replaced by another technique (plan 2.6.3).
