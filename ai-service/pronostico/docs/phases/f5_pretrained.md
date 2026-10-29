# F5 - Pretrained model: Chronos zero-shot

- Date: 2026-10-24
- Plan phase: model configuration (section 2.6.3, Table 20, family "Preentrenados")
- Inputs consumed: F2c series with the owner-confirmed catalog merges; `configs/models.yaml`.

## Goal

Add the pretrained family to the common protocol: a published time-series foundation model used
without any fitting on the company's data, compared on the same series, origins and horizons as
every other model.

## Delivered

| Item | Location |
|---|---|
| `ChronosZeroShot`: panel forecaster, one batched call per origin, median (quantile 0.5) clipped at zero | `models/foundation.py` |
| Weights pinned: `amazon/chronos-bolt-small` (48M parameters, Apache-2.0), revision `772f3d25d38aec6d914c8949dab4462e2d46f5d8`, 190.9 MB, cached in `models_cache/` (`HF_HOME`, not in Git), telemetry off | `configs/models.yaml`, `cli.py` |
| Chronos in a separate worker process and LightGBM imported lazily, so their OpenMP runtimes never meet | ADR-0009 |
| Registry: Chronos built only when pinned and the `foundation` extra is installed; otherwise reported in `not_implemented` | `models/registry.py` |
| Dashboard label "Chronos (zero-shot)" | `app/dashboard.py` |

## Results (internal validation, development span)

| Run | Series | Models | Chronos time | Failures |
|---|---|---|---|---|
| weekly, window 52 | 1,728 | 8 (all families except the fine-tuned variant) | 32.4 s | 0 |
| monthly, window 18 | 1,728 | 8 | 8.3 s | 0 |
| weekly, truncated window 26 | 1,728 | 8 | 26.0 s | 0 |
| monthly, truncated window 9 | 1,728 | 8 | 7.8 s | 0 |

Accuracy is compared in F7 (`f7_statistics.md`). Chronos is deterministic: two calls on the same
histories give identical forecasts, in the main process and in the worker.

## Verification

| Check | Result |
|---|---|
| Unit tests with a fake pipeline (batching, clipping, single load, registry rules) | pass, without PyTorch or weights |
| Real run after LightGBM training in the same program | no OpenMP abort; forecasts identical to an in-process run |
| `test_span_used` in every run record | `false` |
| Tests in Docker (without the foundation extra: Chronos reported as not available) | pass, 275 tests |
| SonarQube | gate passed (`evidence/f7/sonar_f5_f7.txt`) |

## Decisions and deviations

- The fine-tuned variant (Table 20, "Ajuste ligero") was added in F8a (`f8a_pre_freeze_models.md`,
  ADR-0011); until then it was reported in `not_implemented`, never replaced by another technique.
- Chronos-Bolt is used instead of the original sampling Chronos: it is deterministic and much faster
  on CPU; the plan's "median of the samples" becomes the median quantile.
- The model and its revision are recorded in `models.yaml` (part of the F8 freeze).
