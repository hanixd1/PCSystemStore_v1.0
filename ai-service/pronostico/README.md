# sistema-pronostico (`pcsforecast`)

Comparative demand-forecasting system for PCSystemStore. It is the research artifact of the
thesis plan (*Plan ts v2*): it audits the company's sales records, builds category and SKU
series, runs several model families under one rolling-origin protocol, simulates a common
replenishment policy and contrasts the hypotheses.

The project has two stages:

1. **Research (current).** Batch, reproducible, frozen before the final test span is opened once.
2. **Production (after the thesis).** Recurring forecasts with the frozen models, prospective
   logging and human-approved replenishment suggestions. Lives in a future `service/` layer.

## Quick start

Requirements: [uv](https://docs.astral.sh/uv/), Docker Desktop.

```bash
make install        # Python 3.12 venv: core + research extra (via the dev group) + dev tools
make check          # lint, types, tests with coverage
make test-docker    # the same test suite inside the Linux container
pcs check-config    # validate configs/*.yaml (via `uv run pcs ...`)
```

Dependencies: `[project] dependencies` hold only what the production service reads (numpy,
pandas, pyarrow, pydantic); the research pipeline (LightGBM, pdfplumber, openpyxl, pandera,
scipy, PyYAML, Typer) is the `research` extra, which the `dev` group installs with `uv sync`.
The ai-service installs the package without it (`pip install -e ./pronostico`).

Phase F1 pipeline (files delivered by the company go in `datos/`):

```bash
uv run pcs register-raw   # read-only copy + SHA-256 manifest in data/00_raw
uv run pcs stage          # extraction sheet in data/01_staged
uv run pcs audit          # dates, cleaning, anonymisation, audit report in data/02_clean
uv run pcs stage-receipts # retail facturas/boletas (PDF) in data/01_staged/retail, customers as codes
uv run pcs audit-receipts # reconciliation, numbering coverage, clean items in data/02_clean/retail
uv run pcs build-series   # catalog of both channels, panels by channel (test span sealed), profile
uv run pcs ingest-prices  # distributor price list in data/02_clean/prices
uv run pcs link-prices    # catalog/retail links to the list, merge proposals, SKU list prices
uv run pcs tune --frequency weekly             # hyperparameter search -> configs/tuned.yaml
uv run pcs run-validation --frequency weekly   # rolling-origin validation in outputs/runs
uv run pcs run-validation --frequency weekly --condition truncated  # HE3 truncated history
uv run pcs simulate --frequency weekly         # (R, S) inventory simulation in outputs/runs
uv run pcs run-stats --frequency weekly        # Friedman/Nemenyi, DM, Wilcoxon, Spearman, HE3
scripts/cross_check_statsforecast.sh weekly    # own statistical models vs statsforecast
uv run pcs compare-runs RUN_A RUN_B            # reproducibility: prediction differences
uv run pcs article-tables                      # evidence tables for the article
uv run pcs freeze --check                      # what still blocks the freeze
scripts/freeze.sh                              # FREEZE.json + tag (only after approval)
uv run pcs run-final-test --rehearsal          # F9 procedure on the development span (test sealed)
scripts/open_test.sh                           # F9: open the final test once (after the freeze)
uv run pcs article-tables --stage test         # evidence tables with the final-test results
uv sync --extra app && make dashboard          # read-only dashboard on http://localhost:8501
make check-privacy                             # no customer name or DNI/RUC outside data/private
```

Optional dependency groups are installed only when a phase needs them:
`--extra foundation` (PyTorch, Chronos zero-shot and fine-tuned; weights pinned in `models.yaml`,
cached in `models_cache/`),
`--extra stats`, `--extra app`. On macOS LightGBM needs OpenMP: `brew install libomp`.

## Layout

```
configs/            experiment parameters (protocol, models, inventory, data rules)
data/               never in Git: 00_raw → 01_staged → 02_clean → 03_series → 04_manifests, private/
datos/              files as delivered by the company (never edited, never in Git)
models_cache/       pinned Hugging Face weights (HF_HOME), never in Git
src/pcsforecast/    the package; one subpackage per responsibility, added in its phase
tests/              unit/ · property/ · integration/
docs/               adr/ · process/ · quality/ · phases/ (+ evidence/)
outputs/runs/       one folder per run: predictions, metrics, simulation, run.json
```

Planned subpackages and the phase that introduces each one are listed in
[docs/process/project_plan.md](docs/process/project_plan.md). Modules are created when their
phase starts; there are no placeholder modules.

## Rules that the code enforces

- Raw files are read-only. Every cleaning step is a declared rule and is logged with the
  original value, the new value, the rule id and the reason.
- Models only receive training data up to the forecast origin.
- The final test span is sealed until the configuration is frozen (phase F8) and is opened once.
- All parameters live in `configs/`; every run records config hashes, seeds, versions,
  hardware and timings.

## Documentation

- Methodology and stack: [docs/adr/](docs/adr/)
- Project plan and phases (ISO/IEC 29110): [docs/process/project_plan.md](docs/process/project_plan.md)
- Quality plan, ISO alignment and SonarQube gate: [docs/quality/quality_plan.md](docs/quality/quality_plan.md)
- Phase reports and evidence: [docs/phases/](docs/phases/)
- Data dictionary: [docs/data_dictionary.md](docs/data_dictionary.md)
- Personal-data protection: [docs/quality/privacy.md](docs/quality/privacy.md)
