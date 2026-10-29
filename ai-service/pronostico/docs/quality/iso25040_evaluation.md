# Product quality evaluation (ISO/IEC 25040 process)

- Date: 2026-10-24 (phase F8, before the freeze)
- Product: `pcsforecast` 0.1.0 at commit `590de74` plus the F8 changes, with its configuration,
  data pipeline and dashboard.
- Evaluator: the researcher (self-evaluation). The project is **aligned with** ISO/IEC 25040; it
  is not an independent or certified evaluation.
- Quality model and measures: `docs/quality/quality_plan.md` (ISO/IEC 25010:2023, 25059, 25012).

## 1. Evaluation requirements

- **Purpose**: decide whether the system can be frozen and used once on the sealed final test;
  in other words, whether its results can be trusted as research evidence.
- **Product parts evaluated**: ingestion and audit, catalog and series, validation engine and
  models, inventory simulator, statistics, configuration and freeze, dashboard.
- **Stakeholders**: the researcher (owner of PCSystemStore), the thesis advisor and the
  journal's reviewers.
- **Rigour**: every measure is produced by a command or a test that can be rerun; no measure is
  estimated by hand.

## 2. Evaluation specification

The measures, targets and evidence sources are those of the quality plan (section 1), plus the
reliability tests the thesis plan requires (2.5.2 B) and the content of the experiment record
(Annex 04, Table 30). Decision criteria:

- **Met**: the target is reached.
- **Partly met**: the target is reached with a stated gap.
- **Pending**: the measure depends on an action not yet taken.
- **Not applicable**: the characteristic belongs to a later stage.

## 3. Evaluation design

| Activity | Method | Tool |
|---|---|---|
| Functional correctness | Unit, property and integration tests; reference cross-check | pytest; `pcs compare-reference` (statsforecast 2.1.1) |
| Compatibility | Same tests on the host (macOS arm64) and in the container (Debian 13, Python 3.14.9) | `make check`, `make test-docker` |
| Reliability | Rebuild the series and rerun validation; compare outputs byte for byte | `pcs build-series`, `pcs compare-runs` |
| Maintainability, security of code | Static analysis with the project quality gate | SonarQube Community Build 26.9 |
| Confidentiality | Leak scan for customer names and DNI/RUC | `pcs check-privacy` |
| Transparency | Inventory of model cards, risk register, statement of applicability | `docs/model_cards/`, `docs/quality/` |
| Readiness to freeze | Every freeze condition checked by the system | `pcs freeze --check` |

## 4. Execution: measured results

| Characteristic | Measure | Target | Result | Verdict |
|---|---|---|---|---|
| Functional suitability - correctness | Tests passing | All | 307 pass on the host; 306 pass + 1 skipped in the container (real Chronos fine-tuning, no PyTorch there) | Met |
| | Own statistical models vs statsforecast | Same forecasts | Naive, SES, Croston, SBA, TSB agree on 31,104 real cases to ≤ 2.3e-13 | Met |
| AI functional correctness (25059) | No data after the origin reaches a model; test sealed | All pass | Read-only `TrainView` and seal tests pass; the seal now also checks the configuration hashes recorded at the freeze; `test_span_used = false` in every record | Met |
| | Property-based tests of the origin cut and stock balance | Planned in `tests/property` | Hypothesis tests of the origin cut (also with the future changed), validation origins and simulator invariants (demand conserved, no negative stock, bounded orders), added 2026-10-25 | Met (Q-1 closed) |
| Performance efficiency | Wall time and peak memory per run | Reported | Weekly validation: 0.2 s (naive) to 196 s (fine-tuned Chronos) per model; peak memory 1.9 GB (main) + 1.9 GB (Chronos worker) on a 16 GB laptop; monthly: 0.6 GB + 2.2 GB | Met (memory recorded since 2026-10-24; Q-2) |
| Compatibility | Host vs container differences | Measured | LightGBM ≤ 4.4e-16; other models and simulations identical (F4, Python 3.14 evidence); Chronos verified on the host only | Met, with a scope limit |
| Interaction capability | Dashboard readable by the purchasing manager | Reviewed by the user | Read-only Spanish dashboard with model, inventory and statistics tabs, shown to the owner and advisor on 2026-10-24; no formal usability measure | Partly met |
| Reliability - fault tolerance | Failed forecasts logged, run continues | 100 % logged | Failures recorded per series and origin; 0 failures in the nine-model runs | Met |
| Reliability (plan 2.5.2 B) | Reconciliation | Lines reproduce totals | Vecinos: 564/567 daily blocks match (1 mismatch, 2 without a usable total); receipts: 1,151/1,151 within S/ 0.005 | Met (exceptions logged) |
| | Repeatability | Same series from the same sources | All 7 series outputs identical after a rebuild | Met |
| | Reproducibility | Dispersion between executions | 0: weekly 9 × 202,176 and monthly 9 × 13,824 forecasts identical on a second run | Met |
| Security - confidentiality | Customer identifiers outside `data/private` | 0 leaks | No DNI/RUC; the owner reviewed every match on 2026-10-26: 4 reseller or shop names allow-listed, 7 ordinary words accepted as residual matches (`privacy.md`) | Met (Q-3 closed by the owner's review) |
| Maintainability | SonarQube gate | Passed | Passed: reliability, security and maintainability A; 0 bugs, 0 vulnerabilities, 0 code smells, 0 hotspots; duplication 0.0 %; coverage 98.2 % (7,216 lines) | Met |
| Flexibility | New models without changing the evaluation | One interface | 9 models behind `Forecaster`/`PanelForecaster`; Chronos zero-shot (F5) and fine-tuned (F8a) added without changing the engine | Met |
| Safety / human oversight | Approval step before ordering | Mandatory | No ordering in the research stage; required for F11 | Not applicable yet |
| AI transparency (25059, 42001) | Model card per model | 1 per model | 9 of 9 (`docs/model_cards/`); AI risk register and ISO/IEC 42001 statement of applicability written | Met |
| Data quality (25012) | Audit checks | Counted with denominators | F1 and F1b audit reports; rules R101-R209 and R301-R307 | Met |
| Experiment record (Table 30) | Fields present in every run record | 10 of 10 | 10 of 10 since 2026-10-25: identifier, configuration, versions incl. pinned weights, parameters, seeds, manifest hashes, times by stage (preparation, fit, inference; fit not separable for the statistical recursions), hardware incl. memory, state, unrounded predictions | Met (Q-4 closed) |
| Validity of the instruments (plan 2.5.2 A, amendment v4) | Schema validation, accounting reconciliation, leakage control, SHA-256 reproducibility | All enforced by the system | Schemas on every table; 1,151/1,151 fiscal receipts reconciled; vecinos 564/567 blocks with exceptions reported; seal and property tests; reruns bit-identical | Met |

## 5. Conclusion

The product meets the targets that bear on the trustworthiness of the results:
- correctness, including against an external reference;
- leakage control;
- reliability (reconciliation, repeatability, bit-for-bit reproducibility);
- maintainability;
- transparency.

The configuration can be frozen once these conditions are met:

1. **Q-3** (closed 2026-10-26): the owner reviewed the remaining privacy matches.
2. Every configuration file is set to `status: frozen` and committed. Then `scripts/freeze.sh`
   writes `FREEZE.json` and the tag `v1.0.0-research-freeze`.

Findings that do not block the freeze, to report as limitations:

- **Q-2**: memory is recorded only from F8 on.
- **Interaction capability**: there was no formal usability study.

Q-1 and Q-4 were closed on 2026-10-25 after an external code review
(`reviews/2026-10-25-expert-code-review.md`). The same review added the plan items that had no
code yet: the expanding-window contrast, the 3-month monthly sensitivity, the mean-training-price
valuation and the demand-structure indicators.

Content validation by expert judgement (Aiken's V, former Q-5) was removed from the plan by
amendment v4 (2026-10-26). Validity is now established algorithmically (row "Validity of the
instruments"), and the freeze checks the accounting reconciliation.

`pcs freeze --check` on 2026-10-26 (`docs/phases/evidence/f8/freeze_check.txt`):
- passed: data manifests, pinned weights cached, reconciliation (1,151/1,151 receipts), test span
  unused;
- pending: configs frozen.
