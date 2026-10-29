# F8a - Pre-freeze models: hyperparameter search, Chronos fine-tuning, statsforecast cross-check

- Date: 2026-10-24
- Plan phase: model configuration (section 2.6.3, Table 20) and software tools (Table 23), the last
  model work before the F8 freeze; development span only, final test sealed.
- Inputs consumed: F2c series with the owner-confirmed catalog merges (`data/03_series`, manifest
  unchanged since F5/F7); `configs/models.yaml`, `configs/tuning.yaml`, `configs/protocol.yaml`.

## Goal

Close the three items the plan requires before the configuration is frozen:

1. Hyperparameters "elegidos en orígenes internos anteriores a la prueba, con un presupuesto de
   búsqueda declarado" (2.6.3; Table 20: SES, TSB).
2. The second pretrained configuration, "Ajuste ligero: ajuste con el entrenamiento y validación
   interna reservada" (Table 20).
3. The cross-check of the own statistical models against statsforecast (Table 23, ADR-0004).

## Delivered

| Item | Location |
|---|---|
| Declared search: grids, budgets (5-16 candidates per model), tuning origins (every 4th weekly origin, every monthly origin), metric (mean MASE, channel `total`), seed | `configs/tuning.yaml`, ADR-0010 |
| `pcs tune --frequency`: candidates through the validation engine; scores in `outputs/tuning/<run>/`; selection in `configs/tuned.yaml` (generated, frozen in F8) | `tuning/search.py`, `tuning/run.py` |
| Parameter precedence `tuned.yaml` > `params_by_frequency` > `params`; effective parameters, `tuned.yaml` hash and model reports in every run record | `models/registry.py`, `runner/run.py`, `inventory/run.py` |
| `chronos_fine_tuned`: AdamW on the Chronos-Bolt quantile loss, reserved last `horizon` periods, early stopping (best checked step, step 0 included), quarterly refits, in the Chronos worker | `models/foundation.py`, `configs/models.yaml`, ADR-0011 |
| Cross-check in three steps (statsforecast 2.1.1 needs `pandas<3`): `pcs reference-cases`, isolated reference script, `pcs compare-reference` | `reference/crosscheck.py`, `scripts/reference/`, `scripts/cross_check_statsforecast.sh` |
| Declared pairs `chronos_fine_tuned` vs naive and vs `chronos_zero_shot` | `configs/stats.yaml` |
| Dashboard label "Chronos (ajuste ligero)" | `app/dashboard.py` |

## Results

### Hyperparameter search (`evidence/f8a/tuning_*.md`)

Mean MASE on the tuning origins, channel `total` (457 series scored, 1,728 trained):

| Model | Weekly declared → selected | Weekly selection | Monthly declared → selected | Monthly selection |
|---|---|---|---|---|
| Croston | 2.413 → 2.395 | α 0.15 | 2.981 → 2.949 | α 0.2 |
| SBA | 2.329 → 2.190 | α 0.3 | 2.885 → 2.677 | α 0.3 |
| TSB | 1.185 → 1.164 | α_d 0.3, α_p 0.3 | 1.586 → 1.355 | α_d 0.3, α_p 0.3 |
| Two-stage trees | 9.182 → 8.967 | lr 0.03, 31 leaves, min 50, 200 rounds | 3.955 → 3.599 | lr 0.05, 15 leaves, min 50, 100 rounds |
| Global GBM | 1.139 → 1.015 | lr 0.05, 31 leaves, min 50, 200 rounds | 3.028 → 2.023 | lr 0.05, 31 leaves, min 50, 200 rounds |

Total search time: 6.7 min weekly, 1.2 min monthly. Several selections lie on the edge of the
declared grid (SBA and TSB at 0.3, GBM at 31 leaves / 200 rounds); the grid is **not** widened
after seeing these scores, and the edge selections are reported as a limitation.

### Chronos light fine-tuning (`evidence/f8a/run_validation_*.json`, `model_details`)

| Run | Refits | Validation loss on the reserve (zero-shot → fine-tuned) | Best step | Time |
|---|---|---|---|---|
| weekly | 5 | 1.73→1.49, 1.76→1.61, 1.05→0.89, 1.00→0.89, 1.01→0.87 | 125-250 | 196 s |
| monthly | 3 | 0.43→0.37, 0.42→0.38, 0.39→0.36 | 250-475 | 159 s |

Every refit improved on the reserve (none kept the zero-shot weights). Mean MASE, channel `total`,
h = 1 (`evidence/f8a/validation_mase_*.md`):

| Level | Weekly fine-tuned | Weekly zero-shot | Weekly naive | Monthly fine-tuned | Monthly zero-shot | Monthly naive |
|---|---|---|---|---|---|---|
| SKU | 0.828 | 1.022 | 1.263 | 1.160 | 1.232 | 1.266 |
| Category | 0.626 | 0.642 | 0.812 | 0.493 | 0.535 | 0.607 |
| Total | 0.678 | 0.704 | 0.787 | 0.378 | 0.529 | 0.419 |

### statsforecast cross-check (`evidence/f8a/crosscheck_*.md`)

| Frequency | Cases (series × 10 origins) | Naive | SES | Croston | SBA | TSB (same initialisation) | TSB declared |
|---|---|---|---|---|---|---|---|
| weekly | 17,280 | 0 | 1.1e-13 | 4.3e-14 | 4.3e-14 | 5.7e-14 | 7.4e-8 |
| monthly | 13,824 | 0 | 1.1e-13 | 2.3e-13 | 2.3e-13 | 8.5e-14 | 0.043 |

Maximum absolute difference of the one-step forecasts. Every recursion agrees with statsforecast
2.1.1 to floating-point precision. The declared TSB initialisation (share of periods with demand)
differs from statsforecast's (first period) as documented; the effect fades with the window
(negligible on 52 weeks, at most 0.043 units on 18 months).

### F7 statistics with nine models (`evidence/f7/stats_*.md`)

- HE1: Friedman rejects equal performance at every level (weekly SKU and category p < 1e-9;
  monthly categories p = 1.4e-5). Best mean rank: Chronos fine-tuned (weekly SKU 1.82, then
  zero-shot 3.08 and naive 3.95; monthly SKU 2.69, then naive 3.04). Under squared loss
  (Diebold-Mariano, h = 1) no model beats naive in any series after Holm; fine-tuned beats
  zero-shot in 5 weekly series and loses in none.
- HE2: Spearman between the ranking by MASE and by fill rate stays negative at SKU level (weekly
  ρ = -0.35 [-0.52, 0.00]; monthly ρ = -0.88 [-0.93, -0.53]); the upper bounds are below 0.5.
- HE3: the change of MASE after the break and with truncated history differs across models
  (p < 1e-4 at every level).

These describe the development span only. Tuned models were selected on a subset of the same
origins, so their internal results are optimistic; the unbiased comparison is the final test.

## Verification

| Check | Result |
|---|---|
| Unit and integration tests (candidates, budget sampling, scoring, `tuned.yaml` round trip, precedence, refit cadence, training windows, real fine-tuning of a tiny Chronos-Bolt in its own process, cross-check comparison, CLI end to end, refusals) | 290 pass on the host |
| Tests in Docker (without the foundation extra: the real fine-tuning check is skipped) | 289 pass, 1 skipped |
| Determinism: two fine-tunings with the same inputs | identical losses |
| `test_span_used` in every tuning, validation, inventory and stats record | `false` |
| `pcs check-privacy` | no new customer data; the only matches are the ordinary product words already pending the owner's review (one of them now also appears in ADR-0010, ADR-0011 and the project plan) |
| SonarQube | gate passed: 0 bugs, 0 vulnerabilities, 0 code smells, 0 hotspots, coverage 98.1 % (`evidence/f8a/sonar_f8a.txt`) |

## Decisions and deviations

- SES is not searched: its alpha is already chosen per series and origin on the training window.
- Fine-tuning settings are the published AutoGluon defaults for Chronos fine-tuning, declared, not
  searched; the refit is quarterly instead of at every origin to keep each run under 4 minutes.
- The `reference` extra is removed from `pyproject.toml`: statsforecast cannot be installed next
  to pandas 3, so the cross-check runs in an isolated environment pinned in the script.
- Next (F8): ISO/IEC 25040 evaluation, model cards, algorithmic validity evidence,
  `FREEZE.json` with the hashes of every configuration (including `tuning.yaml` and `tuned.yaml`),
  tag `v1.0.0-research-freeze`.
