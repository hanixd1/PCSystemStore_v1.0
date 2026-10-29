# ADR-0002 — Technology stack

- Status: accepted
- Date: 2026-10-21

## Context

Table 23 of the plan lists Python 3, pandas/NumPy, statsforecast, LightGBM/scikit-learn,
published pretrained models (e.g. Chronos), SciPy/scikit-posthocs, Matplotlib and Git. The stack
must be reproducible across macOS (development, Apple M-series, 16 GB, fanless) and Linux (Docker),
and light enough for the data and audit tests to run in seconds.

## Decision

| Concern | Choice |
|---|---|
| Language and environment | Python 3.14 (since 2026-10-23, [ADR-0006](0006-python-3-14-runtime.md); 3.12 before), `uv` with `uv.lock` (exact, cross-platform) |
| Data | pandas + pyarrow (Parquet), openpyxl for the company's Excel files |
| Configuration | YAML in `configs/` validated by pydantic (`extra="forbid"`, immutable) |
| Data contracts | pandera DataFrame schemas for the Table 19 instruments (from F1) |
| Statistical and intermittent models | statsforecast (Naive, SES, Croston, SBA, TSB) |
| Machine learning | LightGBM, mlforecast, scikit-learn |
| Pretrained models | chronos-forecasting + PyTorch (CPU wheels on Linux) |
| Metrics, inventory simulator, DM test, block bootstrap | own code, tested against references |
| Statistics | SciPy, scikit-posthocs |
| Reporting | Matplotlib; CSV/XLSX for the thesis, LaTeX for the article |
| Interface (research) | Streamlit, read-only over `outputs/` |
| CLI | Typer (`pcs ...`), one command per phase |
| Quality | pytest + pytest-cov + Hypothesis, ruff, mypy (strict), pre-commit, SonarQube |
| Runtime | Docker image built from the lockfile |
| Versioning | Git; company data never enters Git |

Heavy dependencies are optional extras (`models`, `foundation`, `stats`, `app`) so the core
environment stays small. Pretrained weights are cached in `models_cache/` (`HF_HOME`) and pinned by
Hugging Face revision in `configs/models.yaml`; a frozen config without a pinned revision is
rejected by validation.

Storage is files (Parquet + JSON manifests), not a database server: the research stage is batch
and file hashes make freezes verifiable. PostgreSQL, FastAPI and a scheduler are deferred to the
production stage (F11).

## Consequences

- Locked versions at F0: numpy 2.5.4, pandas 3.0.6, pandera 0.34.1, pydantic 2.14.1,
  statsforecast 2.0.1, mlforecast 1.0.2, lightgbm 4.7.0, torch 2.14.1, chronos-forecasting 2.3.2,
  scipy 1.18.1, streamlit 1.66.0. Any upgrade is a change-log entry and, after F8, is forbidden
  for the research results.
- Floating-point results of tree models may differ between macOS and Linux. The container is the
  reference platform for reported numbers; differences are measured and reported, never rounded
  away.
