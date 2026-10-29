# Python 3.12.15 → 3.14.9: equivalence evidence (2026-10-23)

Same code, same `uv.lock` package versions (only the interpreter changed), same delivered workbook.
Pipeline re-run: `pcs stage`, `audit`, `build-series`, `run-validation` (weekly, monthly),
`simulate` (weekly, monthly). Differences are reported unrounded.

## Host: Python 3.14.9 vs Python 3.12.15 (macOS arm64)

| Tables compared | Identical |
|---|---|
| `data/01_staged`, `data/02_clean`, `data/03_series` (13) and the four latest runs in `outputs/runs` (6) | 19 / 19 (`DataFrame.equals`) |

## Host vs container, both Python 3.14.9 (macOS arm64 vs Debian 13 trixie arm64)

| Table | Column | Rows that differ | Max abs. difference |
|---|---|---|---|
| `03_series/profile.parquet` | `cv2` | 5 of 2,240 | 1.1102230246251565e-16 |
| weekly validation `predictions.parquet` | `y_hat` | 110 | 4.440892098500626e-16 |
| weekly validation `metrics.parquet` | `mae` | 1 | 2.220446049250313e-16 |
| weekly validation `metrics.parquet` | `bias` | 4 | 2.7755575615628914e-17 |
| weekly validation `metrics.parquet` | `cumulative_bias` | 4 | 1.7763568394002505e-15 |
| weekly validation `metrics.parquet` | `mase` | 1 | 4.440892098500626e-16 |
| weekly validation `metrics.parquet` | `rmsse` | 1 | 1.1102230246251565e-16 |
| weekly validation `metrics.parquet` | `rel_mae` | 1 | 4.440892098500626e-16 |
| monthly validation `metrics.parquet` | `rmse` | 1 | 5.551115123125783e-17 |
| monthly validation `predictions.parquet` | `y_hat` | 6 | 2.220446049250313e-16 |

All other data tables and both inventory runs are identical. Demand classes are identical. The
pattern matches the one recorded under Python 3.12 (floating-point summation order of LightGBM and
NumPy on different platforms).

## Checks

| Check | Result |
|---|---|
| ruff, ruff format, strict mypy | pass |
| pytest on host (`-W error::DeprecationWarning`) | 210 passed, coverage 98.85 % |
| pytest in the container (`make test-docker`) | 210 passed |
| SonarQube | quality gate passed; 0 bugs, 0 vulnerabilities, 0 code smells, 0 hotspots, coverage 98.9 %, duplication 0.0 % |
| All optional extras installed on the host (`uv sync --all-extras`) | import OK (torch 2.14.1, chronos, statsforecast 2.0.1 built from source) |

Environment fingerprints: `environment_host.json`, `environment_container.json`.
