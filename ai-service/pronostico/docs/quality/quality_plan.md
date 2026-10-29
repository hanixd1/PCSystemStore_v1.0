# Quality plan

Plan of the product-quality evaluation (ISO/IEC 25001 → ISO/IEC 25040) and alignment of the
project with the standards chosen in [ADR-0003](../adr/0003-quality-framework.md). The project is
**aligned with** these standards; it is not certified.

## 1. Quality model (ISO/IEC 25010:2023 + ISO/IEC 25059)

| Characteristic | What it means here | Measure | Target | Evidence source |
|---|---|---|---|---|
| Functional suitability — correctness | Metrics, models and simulator compute what the plan defines | Unit tests against hand-computed and reference values | All pass | `tests/unit` |
| Functional suitability — AI functional correctness (25059) | No information from after the origin reaches a model; test span sealed | Property tests on `TrainView`; seal test | All pass | `tests/property` (F3) |
| Performance efficiency | Runs fit the available hardware | Wall time per model and peak memory per run, logged | Reported (HE3) | `run.json` |
| Compatibility | Same results host vs container | Byte equality or measured difference | Reported, never rounded | phase evidence |
| Interaction capability | Results readable by the purchasing manager | Read-only dashboard, Spanish labels | Reviewed by user | F7 |
| Reliability — fault tolerance | A failing model does not stop the run; failure is logged | Execution coverage per model | 100 % logged | `run.json` |
| Security — confidentiality | Customer names never leave `data/private/` | Anonymisation test; no data in Git | 0 leaks | F1 tests, pre-commit hook |
| Maintainability | Modular, analysable, testable code | SonarQube ratings, coverage, duplication, complexity | Quality gate (section 3) | SonarQube |
| Flexibility | New models added without changing evaluation | `Forecaster` interface + registry | 1 interface | F3 |
| Safety (25010:2023) / human oversight (42001) | Production suggests orders; a person approves | Approval step in service | Mandatory | F11 |
| AI transparency (25059, 42001) | Each model documented | Model card per model | 1 per model | `docs/model_cards/` (F3–F5) |

## 2. Data quality model (ISO/IEC 25012)

Applied by the F1 audit; each characteristic becomes a counted check in the quality audit sheet.

| Characteristic | Check on the sales record |
|---|---|
| Completeness | Lines with product, quantity and amount; sheets per calendar day |
| Accuracy (syntactic) | Quantities are positive integers; amounts numeric; dates valid |
| Consistency | Sum of lines equals the sheet's TOTAL row |
| Credibility | Returns (DEV) and warranties separated from gross sales |
| Currentness | Coverage by month; gaps reported |
| Traceability | Every processed row keeps file, sheet and row of origin |
| Confidentiality | Customer identifiers replaced by stable codes |

## 3. SonarQube quality gate

Local SonarQube Community Build (`make sonar-up`, `make sonar`). The gate applied to the project:

| Condition | Threshold |
|---|---|
| Coverage on new code | ≥ 80 % |
| Duplicated lines on new code | < 3 % |
| Reliability rating | A |
| Security rating | A |
| Maintainability rating | A |
| Security hotspots reviewed | 100 % |

Imported reports: coverage (`reports/coverage.xml`), test results (`reports/junit.xml`), ruff and
mypy. SonarQube measures code quality only; scientific validity is covered by the tests in section 1.

## 4. Traceability matrix (standard → requirement → evidence)

| Standard | Requirement taken | Evidence in the project | Since |
|---|---|---|---|
| ISO/IEC 29110 | Project plan, Definition of Done, change control | `docs/process/project_plan.md`, `CHANGELOG.md`, Git history | F0 |
| ISO/IEC/IEEE 12207 | Defined life-cycle stages | Phases F0–F11 | F0 |
| ISO 9001 / 90003 | Documented information, PDCA, nonconformity handling, reviews | Phase reports (plan → do → check → act), deviations section in each report, review records in `docs/quality/reviews/` | F0 / F4 ✓ |
| ISO/IEC 25010 + 25059 | Product quality model and measures | Section 1; SonarQube gate | F0 |
| ISO/IEC 25012 | Data quality characteristics | Section 2; F1 audit sheet (`docs/phases/evidence/f1/audit_report.md`) | F1 ✓ |
| ISO/IEC 25001 / 25040 | Planned and executed product evaluation | This plan; `docs/quality/iso25040_evaluation.md` | F0 / F8 ✓ |
| ISO/IEC 42001 | AI impact assessment, data for AI, life cycle, transparency, human oversight | `docs/quality/iso42001_statement_of_applicability.md`, `docs/model_cards/` | F8 ✓ |
| ISO/IEC 23894 | AI risk identification and treatment | `docs/quality/ai_risk_register.md` | F8 ✓ |
| ISO/IEC/IEEE 29119 | Test plan, test documentation | Section 5; `tests/`; junit reports | F0 |
| ISO/IEC 27001 | Access control, cryptographic integrity, secure development | Read-only raw copies with SHA-256 manifests, step manifests verified on every run, `.gitignore`/pre-commit data block, owner-only key file | F0 / F1 ✓ |
| Law 29733 (Peru) | Personal-data minimisation and pseudonymisation | Keyed-hash customer codes at extraction (R208, R306); receipt addresses never read (R305); key and mappings only in `data/private/` (700/600); `pcs check-privacy` leak scan incl. DNI/RUC; data inventory in `docs/quality/privacy.md` | F1 ✓ / 2026-10-22 ✓ / F1b ✓ |

## 5. Test plan (ISO/IEC/IEEE 29119, summary)

| Level | Purpose | Location | Runs on |
|---|---|---|---|
| Unit | Equations and rules (MASE, RMSSE, Croston/SBA/TSB, inventory balance, config validation) | `tests/unit` | host + Docker |
| Property | Invariants with Hypothesis: no read after origin, stock balance, non-negative orders | `tests/property` | host + Docker |
| Integration | CLI and end-to-end pipeline on synthetic series | `tests/integration` | host + Docker |
| Reproducibility | Re-run with the same seeds gives the same outputs; host vs container differences measured | phase evidence | F3 onwards |

Entry criterion for a phase: previous phase done. Exit criterion: Definition of Done
(project plan, section 4).
