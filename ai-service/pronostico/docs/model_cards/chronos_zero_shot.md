# Model card: Chronos-Bolt small, zero-shot

- Identifier: `chronos_zero_shot`
- Family: Pretrained (foundation model)
- Code: `src/pcsforecast/models/foundation.py` `ChronosZeroShot`
- Status: configuration declared; frozen in F8 together with `models.yaml`, `tuning.yaml` and `tuned.yaml`

## Method

Published weights used without any fitting on the company's data: each origin's training windows are passed in one batch and the median (quantile 0.5) is the point forecast, clipped at zero. Runs on CPU in float32 in a separate worker process (ADR-0009); deterministic.

## Basis and verification

Ansari et al. (2024); plan Table 20 ('Zero-shot: pesos publicados; contexto máximo declarado; mediana').

## Pretrained model (plan Table 20 note)

| Field | Value |
|---|---|
| Name | Chronos-Bolt small (`amazon/chronos-bolt-small`) |
| Version | Hugging Face revision `772f3d25d38aec6d914c8949dab4462e2d46f5d8` |
| Size | 48 M parameters (T5 encoder-decoder, 6 + 6 layers, d_model 512); 190.9 MB of weights |
| Licence | Apache-2.0 |
| Context length | up to 2,048 periods; used: the training window (52 weeks or 18 months; 26 / 9 in the truncated condition) |
| Output | 9 quantiles (0.1-0.9) for up to 64 steps; the median is used |
| Declared pretraining corpus | public time-series datasets and synthetic series (Ansari et al., 2024; model card on Hugging Face) |
| Cache | `models_cache/` (`HF_HOME`), telemetry disabled |

## Configuration

| Frequency | Effective parameters |
|---|---|
| weekly | batch_size = 256 |
| monthly | batch_size = 256 |

## Inputs and data

Training window of each series up to the origin only (rolling 52 weeks / 18 months; `TrainView`, read-only). Series: total, category and SKU demand of PCSystemStore (vecinos record + delivered receipts, amendment v3), 1,728 series per frequency over four channels. No customer data reaches any model.

## Development-span results (channel total, h = 1)

Validation runs `20261024T185612Z-weekly-validation` and `20261024T191817Z-monthly-validation`; inventory runs `20261024T191017Z-weekly-inventory` and `20261024T192254Z-monthly-inventory`.

| Frequency | Level | Mean MASE | Median MASE |
|---|---|---|---|
| weekly | total | 0.704 | 0.704 |
| weekly | category | 0.642 | 0.660 |
| weekly | sku | 1.022 | 0.434 |
| monthly | total | 0.529 | 0.529 |
| monthly | category | 0.535 | 0.516 |
| monthly | sku | 1.232 | 0.104 |

| Frequency | Mean fill rate (SKU, L = 1, target 95 %) | Mean stock on hand (units) | Validation run time (s) | Failed forecasts |
|---|---|---|---|---|
| weekly | 0.938 | 2.163 | 32.1 | 0 |
| monthly | 0.925 | 1.551 | 8.5 | 0 |

Results above are from internal validation on the development span (2024-01 to 2026-02) and describe the rehearsal, not the thesis results; the final test (2026-03-01 to 2026-08-31) is sealed until the freeze.

## Intended use and limitations

Intended use: comparative research on the demand series of PCSystemStore under the frozen protocol; in production (F11) only as a suggestion that a person approves (human oversight). Out of scope: causal claims, other companies without re-validation, unattended ordering.

Scales each series by its context; constant (all-zero) contexts give no information. The pretraining corpus is public data and may differ from intermittent retail demand of computer parts.

## Risks and oversight

See the AI risk register (`docs/quality/ai_risk_register.md`). Failures are logged, never replaced by another technique (plan 2.6.3).
