# Changelog

All notable changes are recorded here (ISO/IEC 29110 change control). Versions follow SemVer;
research freezes are tagged `vX.Y.Z-research-freeze`.

## [Unreleased]

### Changed
- Dependencies (2026-10-29): `[project] dependencies` keep only numpy, pandas, pyarrow and
  pydantic (what `pcsforecast.service` imports); LightGBM, pdfplumber, openpyxl, pandera, scipy,
  PyYAML and Typer moved to the `research` extra, installed by the `dev` group. `uv.lock`
  re-resolved, no package version changed.
- `pcsforecast.service.web_sales` (2026-10-29): PAID web-store orders exported by the backend
  become `web/panel_web.parquet` (channel `web`, optionally added to `total`); `SeriesStore.months`
  now follows the forecast channel only. `service_fit.json` records the series path relative to
  the project.
- Web deployment (2026-10-28, ADR-0013): `requires-python = ">=3.12"`, container
  `python:3.12.15-slim-bookworm`, ruff/mypy/Sonar on 3.12; `uv.lock` re-resolved, no package
  version changed.
- `GET /forecast/research` reads the pattern profile of the served series (`data/service`) and
  falls back to `docs/freeze/FREEZE.json`; missing run records no longer fail the endpoint.
- Research freeze (2026-10-26): every configuration set to `status: frozen`; `FREEZE.json` and
  tag `v1.0.0-research-freeze`. The owner reviewed the privacy matches (Q-3 closed).

### Added
- F10 (`docs/phases/f10_contrast_and_results.md`): `pcs thesis-figures` (critical-difference
  diagrams and fill rate against mean stock, `docs/thesis/figures/`); the Docker image installs
  the `stats` extra so the figure tests run there.
- Protocol amendment v5 (`docs/process/protocol_amendment_v5.md`): owner-corrected dates of the
  test-span vecinos sheets, re-evaluated once as a declared sensitivity (branch
  `amendment/v5-corrected-dates`, tag `v1.1.0-amendment-v5`); every hypothesis decision is
  unchanged (`docs/phases/evidence/amendment_v5_comparison.md`). Optional
  `final_test.record_end` in `protocol.yaml`.
- Thesis chapter III tables (`pcs thesis-tables --stage test`, `docs/thesis/results_tables.md`):
  Shapiro-Wilk normality (descriptive), demand of the development and test spans, patterns,
  time by stage, Chronos refits, hypothesis tables by channel, level, horizon and pattern, and
  ranking stability. Used for chapter III of `Plan tesis v5.docx` (outside the repository).
- F9 single opening of the final test (2026-10-26, commit `2786a20`): 8 runs and 2 statistics
  tables, no failures (`docs/phases/f9_final_test.md`); article tables with the final-test
  results in `docs/article/evidence_tables_final_test.md`.
- F9 final-test harness (ADR-0012), added after the freeze and before the opening:
  `pcs run-final-test` (accuracy with the primary window and both contrasts, inventory with the
  multiplier calibrated on the development origins, statistics), `--rehearsal` on the last six
  development months, `scripts/open_test.sh` and the opening record
  `data/04_manifests/TEST_OPENED.json` (a second opening is refused); `pcs article-tables
  --stage`. Development runs repeated with the harness are identical
  (`docs/phases/evidence/f9/regression.md`).
- Protocol amendment v4 (`docs/process/protocol_amendment_v4.md`, `Plan tesis v4.docx`): validity
  of the instruments established algorithmically (schemas, accounting reconciliation, leakage
  control, SHA-256 reproducibility) instead of expert judgement. `pcs article-tables` builds the
  article's evidence tables (`docs/article/evidence_tables.md`).
- Expert review 2026-10-25 (`docs/quality/reviews/2026-10-25-expert-code-review.md`):
  `pcs run-validation --condition expanding` (Table 17 contrast, in the HE3 table); monthly
  3-month sensitivity horizon evaluated; Table 21 sensitivity "mean training price"
  (`lost_value_sensitivity`); run times by stage (preparation, fit, inference); profile adds
  months with sales and concentration in customers and SKUs; Hypothesis tests of the origin cut,
  validation origins and simulator invariants.
- F8 validation and freeze tooling: `pcs aiken` (Aiken's V with Penfield-Giacobbi intervals),
  expert form `docs/validation/formato_validacion_expertos.docx` and ratings template,
  `pcs freeze --check` / `pcs freeze` with `scripts/freeze.sh` (`FREEZE.json` with hashes of
  configs, lockfile, data manifests, sealed test panel, pinned weights and expert ratings),
  `pcs compare-runs`; the test seal now also verifies the configuration hashes of the freeze;
  `pcs tune` refuses a frozen `tuned.yaml`.
- Run records add pinned pretrained versions, peak memory (process and Chronos worker) and total
  memory; LightGBM seeds explicit in `models.yaml` (forecasts unchanged).
- Model cards for the nine models (`docs/model_cards/`), AI risk register, ISO/IEC 42001
  statement of applicability and the ISO/IEC 25040 evaluation (`docs/quality/`).
- Pre-freeze models (F8a): `pcs tune` searches hyperparameters on internal origins within the
  budget declared in `configs/tuning.yaml` and writes the selection to `configs/tuned.yaml`
  (ADR-0010); `models.yaml` gains `params_by_frequency`; every run record lists the effective
  parameters and the hash of `tuned.yaml`.
- Chronos light fine-tuning (`chronos_fine_tuned`, Table 20 "Ajuste ligero"): own training loop
  on the Chronos-Bolt quantile loss with a reserved internal validation, early stopping and
  quarterly refits, in the Chronos worker (ADR-0011); refit reports in `model_details`.
- statsforecast cross-check: `pcs reference-cases`, `scripts/reference/statsforecast_reference.py`
  (isolated environment), `pcs compare-reference`, `scripts/cross_check_statsforecast.sh`; TSB
  accepts statsforecast's initialisation (`probability_init="first"`) for the comparison.
- Diebold-Mariano/Wilcoxon pairs `chronos_fine_tuned` vs naive and vs `chronos_zero_shot`.
- F7 statistics: `pcs run-stats` (Friedman/Nemenyi, Diebold-Mariano with HLN correction,
  Wilcoxon with Holm, Spearman with series-block bootstrap, HE3 break and truncated-history
  comparisons), `configs/stats.yaml`, `pcs run-validation --condition truncated`, dashboard tab
  "Estadística". SciPy becomes a core dependency.
- F5 pretrained model: Chronos-Bolt small zero-shot with pinned weights, run in a separate worker
  process (ADR-0009); LightGBM is imported only when a model is trained.
- Owner-confirmed catalog merges (117 groups, generic texts left out) in `configs/catalog.yaml`.
- Demand series by channel (amendment v3): `pcs build-series` now reads the audited receipts too
  and builds `total` (primary), `vecinos`, `facturado` and `total_dedup` panels; the catalog covers
  both channels; the SKU panel is selected on total demand; `structural_break` in
  `protocol.yaml`; validation metrics and simulations carry the channel; dashboard channel
  selectors and a chart of total demand by source.
- Protocol amendment v3 (`docs/process/protocol_amendment_v3.md`), decided before the final
  test is opened: total demand (vecinos record + delivered receipts) as the primary series, each
  channel as secondary, deduplicated sensitivity, weeks without a vecinos sheet as confirmed zeros,
  structural break 2025-05-01, SKU panel on total demand, catalog freeze before F8, list-price
  valuation sensitivities.
- F2b price list and catalog links: `pcs ingest-prices` reads the distributor price list (rules
  R401-R405); `pcs link-prices` links vecinos catalog texts and retail descriptions to it by part
  number or weighted tokens with compatibility guards (`configs/price_links.yaml`, ADR-0008),
  gives retail descriptions SKU keys and categories (serial numbers removed), proposes SKU merges
  for the owner and sets SKU list prices; `pcs simulate` adds lost sales valued at list price.
- F1b retail receipts: `pcs stage-receipts` and `pcs audit-receipts` read the SUNAT PDF facturas
  and boletas by word position (pdfplumber, ADR-0007), reconcile every receipt with its printed
  totals, report numbering gaps by month, and log folder mismatches (rules R301-R307 in
  `configs/data_rules.yaml`); dashboard tab "Canal facturado"; synthetic receipt PDFs for tests.
- F2 catalog and series: SKU keys and category rules (`configs/catalog.yaml`), final-test window
  (last 6 complete months), calendars with recorded days, total/category/SKU panels (weekly,
  monthly), physically sealed test panel, ADI/CV²/SBC profile, 80 % SKU panel
  (`configs/series.yaml`), `pcs build-series`.
- F3 engine: `Forecaster` interface, read-only training views, Naive/SES/Croston/SBA/TSB (ADR-0004),
  model registry, internal-validation origins, seal guard, MASE/RMSSE/bias/RelMAE,
  `pcs run-validation`, experiment log in `outputs/runs/`.
- Read-only Streamlit dashboard (`make dashboard`) over the development span and validation runs.
- F4 machine learning: time-safe lag/rolling/intermittence features with a direct multi-horizon
  design, `PanelForecaster` interface, two-stage LightGBM (occurrence × size) and global LightGBM
  (Tweedie, series code), shared forecast-path computation for engine and simulator (ADR-0005).
- F6 inventory: (R, S) lost-sales simulator, safety-stock calibration on the first half of the
  development origins and fixed evaluation on the second half, Table 21 scenarios, `pcs simulate`,
  dashboard tab "Inventario".
- F1 ingest and audit: `pcs register-raw` (read-only raw copies + SHA-256 manifest),
  `pcs stage` (transactional extraction sheet with sheet/row provenance and sales blocks),
  `pcs audit` (sheet-date resolution R101-R111, line rules R201-R208, correction log,
  keyed-hash customer codes, TOTAL reconciliation, ISO/IEC 25012 audit report).
- pandera contracts for the Table 19 instruments, step manifests chaining phase outputs,
  `configs/sheet_date_overrides.yaml`, data dictionary, unit/property/integration tests.
- Record of the company's clarifications (`docs/process/company_clarifications.md`).

### Removed
- Expert content validation (amendment v4): `pcs aiken`, `src/pcsforecast/validation/`, the
  expert form and template (`docs/validation/`) and their generator (`scripts/validation/`).

### Security
- Retail customers are coded by keyed hash of their DNI/RUC at extraction; addresses are never
  read; names and document numbers exist only in `data/private/retail_customers.parquet` (600).
- `pcs check-privacy` also searches DNI/RUC numbers and flags bare document numbers in any
  customer column; the pre-commit hook blocks PDF files.
- Customer names are pseudonymised at extraction: `data/01_staged` holds only codes.
- `data/private/` restricted to 700/600 by the extraction step and by `pcs check-privacy`.
- `pcs check-privacy` (`make check-privacy`): searches all outputs and docs for customer names,
  reports codes only, private allowlist for confirmed coincidences, `--show-names` for the owner.
- Dashboard served only on `127.0.0.1` (`.streamlit/config.toml`).
- Personal-data inventory and rules in `docs/quality/privacy.md`.

### Changed
- `pcs freeze --check` requires the accounting reconciliation (100 % of fiscal receipts) instead
  of the expert ratings; `FREEZE.json` records the reconciliation figures.
- Lost sales are now valued at the price known at the origin: the unit price of the latest period
  with sales in the training window. The mean training price, used until now, is the
  sensitivity. Only the soles columns change.
- Office lock files (`~$*`) are ignored; one committed by mistake was removed.
- `series_id` is now `<frequency>:<channel>:<level>:<key>`. Run `stage-receipts` and
  `audit-receipts` before `build-series`.
- `stage-receipts` reads only the receipts of the current registration (re-filed receipts leave
  their earlier raw copies unused); `register-raw` lists them.
- Python 3.14.9 replaces 3.12 (security support until 2030, ADR-0006); container base image
  `python:3.14.9-slim-trixie` (Debian 13). Outputs identical to 3.12 on the real record
  (`docs/phases/evidence/python314/`).
- External code review of 2026-10-21 (`docs/quality/reviews/`): generic latest-run lookup in the
  dashboard data, `protection_sigma` built on `naive_scales`, linear-time `config.duplicates`,
  `StepManifest.write_parquet`; outputs verified identical on the real record.
- LightGBM is a core dependency; statsforecast/mlforecast/scikit-learn move to the optional
  `reference` extra. Docker image installs `libgomp1`.
- Applied the company's clarifications of 2026-10-21: OBS meanings (`T` = paid ticket, empty =
  not sold, `DAÑADA` = damaged, `CONTR` = return), new movement types `not_sold` and `damaged`,
  `empty_code_type`; copy sheets dated on the following day(s) or the same day (R108).
- Dockerfile keeps uv's download cache across builds and raises the download timeout.
- Second round of company clarifications: `DEBE` confirmed as a sale; new rule R209 excludes
  lines whose OBS holds a date (orders placed with a neighbour); rule R109 withdrawn and columns
  G onwards (the shop's purchases) are no longer read.

## [0.1.0] - 2026-10-21

### Added
- F0 foundation: uv project (Python 3.12, locked dependencies with optional extras),
  validated configuration (`configs/*.yaml` → pydantic models), `pcs` CLI
  (`version`, `env`, `check-config`), environment fingerprint, test suite with branch coverage,
  ruff/mypy/pre-commit, Dockerfile, local SonarQube setup, methodology/stack/quality ADRs,
  project plan and quality plan.
