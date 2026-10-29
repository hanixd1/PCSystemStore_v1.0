# Model card: Teunter-Syntetos-Babai (TSB)

- Identifier: `tsb`
- Family: Intermittent demand
- Code: `src/pcsforecast/models/statistical.py` `TSB`
- Status: configuration declared; frozen in F8 together with `models.yaml`, `tuning.yaml` and `tuned.yaml`

## Method

Demand probability updated every period with α_p (towards 1 after a sale, 0 otherwise) and size updated after a sale with α_d; forecast = probability × size. Declared initialisation: probability = share of periods with demand in the training window; size = first positive demand.

## Basis and verification

Teunter et al. (2011); plan Table 20 (α and β selected on internal validation, ADR-0010; both at the edge 0.3 of the declared grid). Recursion cross-checked against statsforecast `TSB` with its initialisation (differences ≤ 8.5e-14); the declared initialisation differs by at most 0.043 units (monthly).

## Configuration

| Frequency | Effective parameters |
|---|---|
| weekly | alpha_d = 0.3, alpha_p = 0.3 |
| monthly | alpha_d = 0.3, alpha_p = 0.3 |

## Inputs and data

Training window of each series up to the origin only (rolling 52 weeks / 18 months; `TrainView`, read-only). Series: total, category and SKU demand of PCSystemStore (vecinos record + delivered receipts, amendment v3), 1,728 series per frequency over four channels. No customer data reaches any model.

## Development-span results (channel total, h = 1)

Validation runs `20261024T185612Z-weekly-validation` and `20261024T191817Z-monthly-validation`; inventory runs `20261024T191017Z-weekly-inventory` and `20261024T192254Z-monthly-inventory`.

| Frequency | Level | Mean MASE | Median MASE |
|---|---|---|---|
| weekly | total | 0.749 | 0.749 |
| weekly | category | 0.683 | 0.711 |
| weekly | sku | 1.220 | 0.673 |
| monthly | total | 0.605 | 0.605 |
| monthly | category | 0.619 | 0.592 |
| monthly | sku | 1.380 | 0.400 |

| Frequency | Mean fill rate (SKU, L = 1, target 95 %) | Mean stock on hand (units) | Validation run time (s) | Failed forecasts |
|---|---|---|---|---|
| weekly | 0.921 | 2.017 | 0.8 | 0 |
| monthly | 0.937 | 1.755 | 0.1 | 0 |

Results above are from internal validation on the development span (2024-01 to 2026-02) and describe the rehearsal, not the thesis results; the final test (2026-03-01 to 2026-08-31) is sealed until the freeze.

## Intended use and limitations

Intended use: comparative research on the demand series of PCSystemStore under the frozen protocol; in production (F11) only as a suggestion that a person approves (human oversight). Out of scope: causal claims, other companies without re-validation, unattended ordering.

Sensitive to the initial probability on short (monthly, 18-period) windows.

## Risks and oversight

See the AI risk register (`docs/quality/ai_risk_register.md`). Failures are logged, never replaced by another technique (plan 2.6.3).
