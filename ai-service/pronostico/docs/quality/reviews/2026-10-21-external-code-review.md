# External code review - 2026-10-21

Review of the system after F4 by an external professional, recorded as part of the quality
management cycle (ISO 9001 via ISO/IEC/IEEE 90003: review → action → verification). Each finding
was checked against the code before acting on it.

## A. Security and data privacy - confirmed, no action

| Finding | Verified in | Status |
|---|---|---|
| Customer names pseudonymised with HMAC-SHA256 and a 32-byte random key, owner-only permissions | `audit/anonymize.py`; test `test_key_file_is_created_once_and_owner_only` | Confirmed |
| Name-to-code table and key only in `data/private/`, never in clean data or Git | `audit/run.py`; `.gitignore`; test `test_no_customer_name_reaches_clean_lines`; pre-commit data hook | Confirmed |
| Raw files read-only (0o444) and every step verifies the previous manifest's SHA-256 | `ingest/raw_registry.py`, `manifest.verify_outputs`; integration tests on tampered files | Confirmed |
| Models receive read-only views cut at the origin; sealed test panel guarded | `protocol/origins.py`; spy-model and property tests | Confirmed |

## B. Design-level duplication - 4 refactorings applied

SonarQube reported 0 % duplicated lines (no literal clones); the reviewer found four repeated
patterns. All four were confirmed and refactored:

| # | Finding | Action |
|---|---|---|
| 1 | `latest_runs` and `latest_inventory` repeat the same scan of `runs_dir` | One generic `_latest_by_frequency(runs_dir, data_file, build)` in `reporting/dashboard_data.py` |
| 2 | `protection_sigma` recomputes the naive one-step MSE that `naive_scales` already returns | `protection_sigma` now uses `naive_scales` (`inventory/simulator.py`) |
| 3 | Duplicate check `sorted({x for x in items if items.count(x) > 1})` written 4 times, quadratic | `config.duplicates(items)` with `Counter`, linear time, used by the 4 validators |
| 4 | `_write_parquet` / `_write` defined in two step modules | `StepManifest.write_parquet(frame, path)` in `manifest.py` |

Verification:

- New tests for `duplicates`, `StepManifest.write_parquet` and the `protection_sigma` identity
  (`tests/unit/test_helpers.py`); 203 tests pass on the host and in Docker.
- The whole pipeline was re-run on the real record and compared with a snapshot taken before the
  refactoring: the 13 data tables, the audit report, the validation predictions and metrics, and
  the inventory simulations (weekly and monthly) are **identical**.
- SonarQube quality gate passed.

## C. Recursion - confirmed, no action

| Finding | Verified | Status |
|---|---|---|
| No call-stack recursion | AST scan of `src/` and `app/`: no function calls itself | Confirmed |
| Longest chronological run is iterative, O(N log N) with binary search | `audit/sheet_dates.longest_chronological_run` | Confirmed |
| Exponential-smoothing recursions (SES, Croston, TSB) as flat loops, O(T) time, O(1) memory | `models/statistical.py` | Confirmed |
| LightGBM models use a direct multi-horizon strategy (horizon as a feature), so predicted fractional values never feed back into the intermittence features | `features/lagged.py`; rationale added to ADR-0005 | Confirmed |
