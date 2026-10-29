# AI risk register (ISO/IEC 23894 alignment)

- Date: 2026-10-24 (F8, before the freeze)
- Scope: the comparative forecasting system in its research use (F0-F10); production use (F11)
  will be assessed again before it starts.
- Scale: likelihood and impact Low / Medium / High, judged before (inherent) and after treatment
  (residual).

| Id | Risk | Source | Inherent L / I | Treatment in the system | Evidence | Residual L / I |
|---|---|---|---|---|---|---|
| AI-1 | Information from after an origin reaches a model (leakage), so accuracy is overstated | Feature or scale computed on the whole series; test rows read early | M / H | Read-only `TrainView` cut at the origin; scales per origin; the test panel is stored apart and opened only through `assert_unsealed` against a frozen record whose config hashes match | `protocol/origins.py`; tests `test_models_protocol.py`, `test_validation_freeze.py`; `test_span_used = false` in every record | L / H |
| AI-2 | Selection on the development span flatters tuned models (garden of forking paths) | Hyperparameter search; repeated looks at internal results | H / M | Grids and budgets declared in `tuning.yaml` (ADR-0010); grid not widened after seeing scores; declared configuration always candidate 0; final test opened once after the freeze | `evidence/f8a/tuning_*.md` | M / M |
| AI-3 | The structural break (May 2025) and supply-constrained (censored) sales make past demand a poor guide | Component shortage reported by the owner | H / H | Break dated before any test result (amendment v3, D4); HE3 measures the change; truncated-history condition; censoring stated as a limitation | `protocol_amendment_v3.md`; F7 HE3 tables | H / M |
| AI-4 | Customer identities leak through data, outputs or documents | Buyer names in the sales sheets; DNI/RUC on receipts | M / H | Keyed-hash codes at extraction; identities only in `data/private/` (700/600); addresses never read; `pcs check-privacy`; pre-commit blocks data files | `docs/quality/privacy.md`; F1/F1b evidence | L / H |
| AI-5 | Pretrained weights change or disappear upstream | Hugging Face repository updates | M / M | Revision pinned in `models.yaml`; weights cached locally; file hashes recorded in `FREEZE.json` | ADR-0009; `freeze/run.py` | L / M |
| AI-6 | Two numerical runtimes in one process give silently wrong results | PyTorch and LightGBM OpenMP on macOS | M / H | Chronos in a separate worker process; LightGBM imported lazily; the documented workaround that can corrupt results is not used | ADR-0009 | L / H |
| AI-7 | Results cannot be reproduced | Unseeded randomness, library drift, thread races | M / M | Seeds in configs; deterministic LightGBM; lockfile; container reference; reruns compared with `pcs compare-runs` | `evidence/f8/reproducibility.md` | L / M |
| AI-8 | A model is chosen by accuracy although it serves stock worse | Accuracy metrics alone | H / M | Inventory simulation with the same policy for every model; HE2 tests the divergence | F6/F7 reports | M / M |
| AI-9 | Forecasts are used to order stock without review | Over-trust in a "best" model | M / H | Research use only until F11; production design keeps a person approving every order (human oversight) | `project_plan.md` F11; model cards | L / H |
| AI-10 | Catalog errors merge different products or split one product, distorting SKU series | Free-text product descriptions | H / M | Rule-based keys, price-list anchoring, owner-confirmed merges (117), catalog frozen before F8 (D6) | F2b/F2c reports | M / M |
| AI-11 | The instruments do not measure what they intend | Design by one researcher | M / M | Fields derived from Hewamalage et al. (2023); schema validation of every table; accounting reconciliation (100 % of fiscal receipts); leakage control; SHA-256 reproducibility (plan 2.5.2, amendment v4). The freeze checks the reconciliation. | `docs/phases/f8_validation_freeze.md`; `pcs freeze --check`; article tables A-C | L / M |
| AI-12 | Runs exceed the laptop's memory or time | PyTorch, LightGBM and SonarQube together | M / L | Never run SonarQube with heavy runs; Chronos fine-tuning refitted quarterly; peak memory recorded per run | risk R4 in `project_plan.md`; `peak_memory_mb` in run records | L / L |

Review: at the freeze (F8), after the single test opening (F9) and before production (F11).
