# F10 - Hypothesis contrast, results chapter and figures

- Dates: 2026-10-26 to 2026-10-28
- Plan phase: 6 (contrast of the hypotheses), sections 2.6.6 and Table 22. Thesis chapter III,
  "Análisis y discusión de resultados".
- Inputs consumed: the single opening of the frozen final test (F9, `v1.0.0-research-freeze`) and
  the declared re-evaluation of amendment v5 (`v1.1.0-amendment-v5`).
- Status: **done** for the thesis. The conclusions are written by the author from the guide in the
  plan. The article is a later step and reuses these tables and figures.

## Delivered

| Item | Location |
|---|---|
| `pcs thesis-tables --stage test`, in four groups:<br>• normality (Shapiro-Wilk, descriptive);<br>• demand of the development and test spans; demand patterns;<br>• time by stage; Chronos refits;<br>• hypothesis tables by channel, level, horizon and pattern, and ranking stability. | `reporting/thesis.py`, `docs/thesis/results_tables.md` |
| `pcs thesis-figures --stage test`:<br>• critical-difference diagrams (Nemenyi);<br>• fill rate against mean stock. | `reporting/figures.py`, `docs/thesis/figures/` |
| Article evidence tables of the final test | `docs/article/evidence_tables_final_test.md` |
| Amendment v5: owner-corrected sheet dates, re-evaluated once, and the comparison of the two openings | `docs/process/protocol_amendment_v5.md`, `docs/phases/evidence/amendment_v5_comparison.md`, `docs/thesis/results_tables_amendment_v5.md` |
| Optional `final_test.record_end` (declared end of the recorded span) | `config.py`, `series/run.py` |
| Thesis chapter III and conclusions guide | `Documentacion/Plan tesis v5.docx` to `v8.docx` (outside the repository) |

## Plan versions

| Version | Change |
|---|---|
| v5 | Chapter III: descriptive analysis (normality, components, application of the models), contrast of HG and HE1-HE3, discussion, conclusions guide. Tables 24-35. |
| v6 | Amendment v5, as tracked changes: data cut, corrected sheet dates, new section 3.2.5 with Table 36 (frozen vs corrected). |
| v7 | The author's version: adds a temporary reference-usage annex. |
| v8 | Figures 17 (critical difference) and 18 (service against stock), as tracked changes "Figuras F10". |

## Hypothesis decisions (frozen opening; unchanged by amendment v5)

| Hypothesis | Decision | Main evidence |
|---|---|---|
| HG | Accepted | Models differ in:<br>• 32/32 accuracy strata;<br>• 45/64 fill-rate strata;<br>• 53/64 robustness strata. |
| HE1 | Accepted | Fine-tuned Chronos is best on categories and the total series; the naive is best by rank on intermittent SKUs. The same holds in the four channels, with MASE and RMSSE. |
| HE2 | Partly accepted | (a) Inventory differs at monthly frequency and in weekly categories, but not in fill rate for weekly SKUs.<br>(b) Spearman is negative everywhere; its upper bound is below 0.5 in 20 of 24 strata (not in weekly SKUs). |
| HE3 | Accepted | Truncated history and the expanding window change MASE differently across models, except monthly categories at 1 month. The ranking is stable between the development and test origins (rho 0.87-0.98). |

## Figures (design)

- Figure text is in Spanish, with decimal commas.
- Colour encodes the model family: four fixed hues from the reference palette, validated for colour-vision deficiency. The family is also shown by marker shape, and every point carries the model number. Identity never depends on colour alone.
- Critical-difference diagrams follow Demšar (2006):
  - the rank axis runs from 1 to 9;
  - the critical-difference bar sits above the axis;
  - bars join the models that do not differ.

## Verification

| Check | Result |
|---|---|
| Tests on the host | 317 pass |
| SonarQube | gate passed: 0 bugs, 0 vulnerabilities, 0 code smells, 0 hotspots, coverage 97.9 % |
| Tests in Docker | 316 pass, 1 skipped (real Chronos fine-tuning); the image now installs the `stats` extra (matplotlib), so the figure tests run there too |
| Plan documents | every v5-v8 file passes the docx schema validation; all text edits of v6 and v8 are tracked |
| Privacy | `pcs check-privacy` finds no match in the new tables and figures |

## Next phase

F11 (production, post-thesis): connect the forecasting system to the company's local web page. It runs locally first; nothing goes to the cloud or to Git until the author has reviewed it. For daily forecasts it uses the corrected, up-to-date data, not the frozen research data.
