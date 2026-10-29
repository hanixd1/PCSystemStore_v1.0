# F7 - Statistical comparison of the models

- Date: 2026-10-24
- Plan phase: hypothesis testing (section 2.6.6, Tables 14 and 22), rehearsed on internal
  validation; the same code runs once on the final test after the F8 freeze.
- Inputs consumed: the latest full and truncated validation runs and inventory simulations
  (`outputs/runs/`), `configs/stats.yaml`, `structural_break` in `configs/protocol.yaml`.

## Delivered

| Item | Location |
|---|---|
| Friedman (series as blocks), Nemenyi p-values and critical difference, Diebold-Mariano with HLN correction and lag window h - 1, Wilcoxon signed-rank, Holm adjustment, Spearman with a series-block bootstrap | `stats/tests.py` |
| `pcs run-stats --frequency`: HE1, HE2 and HE3 tables in `outputs/stats/<timestamp>-<frequency>/` | `stats/run.py`, `cli.py` |
| HE3 truncated history: `pcs run-validation --condition truncated` (rolling window 26 weeks / 9 months, `truncated_length` in `protocol.yaml`) | `runner/run.py` |
| Test settings declared before the final test: alpha 0.05, pairs (every model against naive, SBA/TSB against Croston, global against two-stage GBM), 1,000 bootstrap resamples, seed, Spearman threshold 0.5, primary scenario L = 1, 95 % | `configs/stats.yaml` |
| Dashboard tab "Estadística" | `app/dashboard.py`, `reporting/dashboard_data.py` |

Every test uses one value per series and model; origins are never treated as independent.

## Results on internal validation (channel `total`, development span)

> Update 2026-10-24 (F8a): the tables in `evidence/f7/` were regenerated with nine models (Chronos
> fine-tuned added, tuned hyperparameters); the summary below is the eight-model run of this phase.
> The nine-model summary is in `f8a_pre_freeze_models.md`. Since 2026-10-25 the HE3 table also
> holds the expanding-window contrast (Table 17), and the monthly tables the 3-month sensitivity
> horizon (`docs/quality/reviews/2026-10-25-expert-code-review.md`).

Full tables: `evidence/f7/stats_weekly.md`, `evidence/f7/stats_monthly.md`. They describe the
development span only and are not the thesis results.

| Hypothesis | Weekly | Monthly |
|---|---|---|
| HE1 - Friedman on MASE | categories (14 series) and SKUs (442) differ, p < 1e-9; best mean rank Chronos (SKU h = 1: 1.88; naive 3.17), worst Croston at SKU level and the global GBM at category level; Nemenyi CD 0.50 at SKU level | categories p = 9e-6, SKUs p < 1e-200; naive (2.69) and Chronos (2.76) lead at SKU level |
| HE1 - Diebold-Mariano (squared loss), h = 1 | no model beats naive in any series after Holm; naive is better in 3 to 143 series depending on the model (Chronos 33) | few significant series (0 to 23 per pair, all in favour of naive) |
| HE2 - Spearman between the ranking by MASE and by fill rate (L = 1, 95 %) | SKU rho = -0.12 [-0.24, 0.16]; category -0.27 [-0.59, 0.16]: the upper bound is below 0.5 | SKU rho = -0.83 [-0.90, -0.33] |
| HE3 - change of MASE | after the break (2025-05-01) the change differs across models (Friedman p < 1e-9); with truncated history too (p ≤ 2e-4) | truncated: SKU p = 3e-31, categories not significant (p = 0.82); no origin targets the span before the break (18 months of minimum training) |

Reading: the most accurate models (by MASE) are not the ones that give the best service; this is
the divergence HE2 anticipates. Chronos leads in mean absolute error but not under squared loss.

## Verification

| Check | Result |
|---|---|
| Unit tests against references (SciPy's Friedman, Demšar's q for k = 3, Holm's worked example, DM sign and degenerate cases) and end-to-end on synthetic runs | pass |
| `test_span_used` in every stats record | `false` |
| Tests in Docker | pass, 275 tests (`evidence/f7/tests_container.txt`) |
| SonarQube | gate passed; 0 bugs, 0 vulnerabilities, 0 code smells (`evidence/f7/sonar_f5_f7.txt`) |

## Decisions and deviations

- The Diebold-Mariano pair Chronos vs naive was added when the pretrained family was implemented,
  following the declared rule "every model against the naive benchmark"; the final test is sealed.
- At the "total" level there is one series per channel, so Friedman is not defined there and the
  Spearman interval collapses to the point estimate; these rows are descriptive.
- Monthly HE3 "after the break" has no "before" origins and is reported as not available.
