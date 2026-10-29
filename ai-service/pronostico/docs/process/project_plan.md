# Project plan (ISO/IEC 29110 — Project Management process)

## 1. Scope

Build and operate the comparative demand-forecasting system defined in *Plan ts v2* for
PCSystemStore: audit of the sales record, category and SKU series (weekly, monthly; vecinos and
facturado channels), four model families, rolling-origin evaluation, (R, S) inventory simulation and
hypothesis tests. Production use is a separate, post-thesis stage (F11).

Out of scope for the research stage: changing the company's real replenishment policy (plan,
delimitation C), causal claims about customers or channels.

## 2. Phases

| Phase | Increment | Plan phase | Main outputs | Planned subpackages |
|---|---|---|---|---|
| F0 | Foundation | — | Repo, locked env, config validation, CLI, Docker, SonarQube, ADRs, quality plan | `config`, `paths`, `runtime`, `cli` |
| F1 | Ingest and audit | 1 | Read-only raw copies + SHA-256 manifest, transactional extraction sheet (sheet/row provenance), quality audit sheet, reconciliation with sheet totals, correction log, customer anonymisation | `schemas`, `ingest`, `audit` |
| F1b | Ingest and audit of retail receipts | 1 | PDF facturas/boletas read by word position, reconciliation with printed totals, numbering completeness, customers coded by DNI/RUC, address never read | `ingest`, `audit`, `privacy` |
| F2 | Catalog and series | 2 | Versioned SKU/category catalog (validated by the company), operating calendar, weekly/monthly panels, ADI–CV² profile, channel-shift analysis | `catalog`, `series` |
| F2b | Price list and catalog links | 2 | Distributor price list, text-to-product links (part number, tokens), retail SKU keys, owner-validated merge proposals, list prices for lost sales | `ingest`, `catalog`, `inventory` |
| F3 | End-to-end slice | — | Origins, `TrainView`, leakage guard, test seal, runner, experiment log, Naive/SES/Croston/SBA/TSB, metrics | `protocol`, `runner`, `models`, `evaluation` |
| F4 | Machine learning | — | Time-safe features, two-stage trees, global GBM | `features`, `models` |
| F5 | Pretrained | — | Chronos zero-shot and light fine-tuning, pinned weights | `models` |
| F8a | Pre-freeze models | 3 | Hyperparameter search on internal origins (declared budget), Chronos light fine-tuning, statsforecast cross-check | `tuning`, `models`, `reference` |
| F6 | Inventory | — | (R, S) simulator, safety-stock calibrator on internal origins | `inventory` |
| F7 | Statistics and interface | — | Friedman/Nemenyi, Diebold–Mariano, Wilcoxon, Spearman + block bootstrap, Holm; reports; Streamlit | `stats`, `reporting`, `app/` |
| F8 | Validation and freeze | 3 | ISO/IEC 25040 evaluation, algorithmic validity and reliability (schemas, reconciliation, leakage control, SHA-256 reproducibility; amendment v4), model cards, article evidence tables, `FREEZE.json` with all hashes, tag `v1.0.0-research-freeze` | `freeze`, `reporting` |
| F9 | Single test opening | 4–5 | Final-test harness (ADR-0012) and rehearsal, final-test predictions, simulation and statistics, opened once (`TEST_OPENED.json`) | `final_test` |
| F10 | Contrast and article | 6 | Hypothesis contrast, thesis chapter III tables (`pcs thesis-tables`) and figures (`pcs thesis-figures`), amendment v5 re-evaluation; the article reuses them | `reporting` |
| F11 | Production (post-thesis) | — | Recurring forecasts with frozen models, prospective log, drift monitoring, human-approved suggestions | `service` |

F0 and F1 do not depend on the open data-coverage question (see risks). F2 onwards do.

## 3. Sprint cadence

Two-week sprints. Each sprint records in `docs/phases/<phase>.md`: goal, backlog items done,
evidence, deviations, and the handoff to the next phase.

## 4. Definition of Done (every phase)

1. Code and tests written; `make check` passes on the host (ruff, strict mypy, pytest with ≥ 80 %
   branch coverage).
2. `make test-docker` passes in the Linux container.
3. SonarQube quality gate passed (`make sonar`).
4. Phase report in `docs/phases/` with evidence in `docs/phases/evidence/<phase>/`, including the
   hashes of the frozen inputs it consumed and the outputs it hands over.
5. `CHANGELOG.md` updated; quality-plan traceability matrix updated.
6. `make check-privacy` passes (no customer name outside `data/private/`).
7. Committed to Git (company data never committed).

## 5. Risks

| Id | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | Recorded vecinos volume drops from ~250 lines/month (2024) to ~40 (2026), none in June 2026. Cause confirmed (2026-10-21): component shortage; stock reallocated to final customers; vecinos order less - a real structural break with supply-constrained (censored) sales. Retail receipts of both RUCs delivered on 2026-10-23 (F1b): 1,116 receipts 2024-01 to 2026-09, all reconciled; missing numbers are lost receipts whose sales are in the vecinos record | High | Protocol amendment v3 (`protocol_amendment_v3.md`, 2026-10-23): total demand as primary series, channels as secondary, weeks without sheet confirmed as zero, break 2025-05-01; amend the protocol (plan v3: test window, aggregation level, channel scope) before any performance is seen; state the censored-demand limitation |
| R2 | Products are free text without SKU codes (1,213 normalised variants after F1) | High | Semi-automatic catalog in F2 with company validation; mapping versioned, never edited in the Excel |
| R3 | Sheet dates are ambiguous ("(2)…(5)" copies, multi-day sheets, typos) | Medium | Resolved in F1: rules R101-R111; copies dated by the company's rule (R108); every valid line now has high or medium date confidence |
| R6 | OBS movement codes | Closed | All codes confirmed by the company on 2026-10-21 (two rounds) |
| R4 | Fanless 16 GB laptop: SonarQube + PyTorch together exhaust memory | Medium | Never run both at once; long runs detached; at most two heavy workers |
| R5 | Library or weight updates change results | Medium | Lockfile, pinned HF revisions, container as reference platform |
