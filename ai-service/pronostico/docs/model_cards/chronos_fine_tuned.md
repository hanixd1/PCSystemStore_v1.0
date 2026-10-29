# Model card: Chronos-Bolt small, light fine-tuning

- Identifier: `chronos_fine_tuned`
- Family: Pretrained (foundation model)
- Code: `src/pcsforecast/models/foundation.py` `ChronosFineTuned` and `fine_tune`
- Status: configuration declared; frozen in F8 together with `models.yaml`, `tuning.yaml` and `tuned.yaml`

## Method

A copy of the same pinned weights is trained with AdamW (learning rate 1e-5, weight decay 0.01, batches of 32 windows, at most 1,000 steps) on the model's quantile loss over windows of the training histories. The last `horizon` periods of every history are reserved as internal validation; the loss there is checked every 25 steps and the best checked weights are kept (patience 4; step 0 = zero-shot weights). Windows with a constant context are skipped. Refitted every quarter (13 weeks / 3 months) with the histories of that origin; the origins in between use the latest fit.

## Basis and verification

Li et al. (2025), Ansari et al. (2024); plan Table 20 ('Ajuste ligero: ajuste con el entrenamiento y validación interna reservada'); ADR-0011. Settings are AutoGluon's published defaults, declared, not searched.

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
| weekly | batch_size = 256, eval_every = 25, learning_rate = 1e-05, max_steps = 1000, min_context = 13, patience = 4, refit_every = 13, seed = 2.0261e+07, train_batch = 32 |
| monthly | batch_size = 256, eval_every = 25, learning_rate = 1e-05, max_steps = 1000, min_context = 6, patience = 4, refit_every = 3, seed = 2.0261e+07, train_batch = 32 |

## Inputs and data

Training window of each series up to the origin only (rolling 52 weeks / 18 months; `TrainView`, read-only). Series: total, category and SKU demand of PCSystemStore (vecinos record + delivered receipts, amendment v3), 1,728 series per frequency over four channels. No customer data reaches any model.

## Development-span results (channel total, h = 1)

Validation runs `20261024T185612Z-weekly-validation` and `20261024T191817Z-monthly-validation`; inventory runs `20261024T191017Z-weekly-inventory` and `20261024T192254Z-monthly-inventory`.

| Frequency | Level | Mean MASE | Median MASE |
|---|---|---|---|
| weekly | total | 0.678 | 0.678 |
| weekly | category | 0.626 | 0.657 |
| weekly | sku | 0.828 | 0.423 |
| monthly | total | 0.378 | 0.378 |
| monthly | category | 0.493 | 0.535 |
| monthly | sku | 1.160 | 0.034 |

| Frequency | Mean fill rate (SKU, L = 1, target 95 %) | Mean stock on hand (units) | Validation run time (s) | Failed forecasts |
|---|---|---|---|---|
| weekly | 0.913 | 1.950 | 196.2 | 0 |
| monthly | 0.921 | 1.421 | 159.4 | 0 |

Results above are from internal validation on the development span (2024-01 to 2026-02) and describe the rehearsal, not the thesis results; the final test (2026-03-01 to 2026-08-31) is sealed until the freeze.

## Intended use and limitations

Intended use: comparative research on the demand series of PCSystemStore under the frozen protocol; in production (F11) only as a suggestion that a person approves (human oversight). Out of scope: causal claims, other companies without re-validation, unattended ordering.

Best mean MASE rank at every level on the development span, but a lower fill rate than zero-shot and the intermittent methods at the 95 % target (HE2 divergence). Fine-tuning cost: about 30-45 s per refit on the laptop CPU.

## Risks and oversight

See the AI risk register (`docs/quality/ai_risk_register.md`). Failures are logged, never replaced by another technique (plan 2.6.3).
