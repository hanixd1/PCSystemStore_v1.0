# ADR-0004 - Baseline and intermittent models implemented in NumPy

- Status: accepted
- Date: 2026-10-21

## Context

Table 23 of the plan lists statsforecast for Naive, SES, Croston, SBA and TSB, and allows the list
to change if the change is recorded. statsforecast compiles with numba on first use, pulls a large
dependency tree into the Docker image (a rebuild already failed on a PyPI timeout), and hides the
recursions behind optimised kernels.

## Decision

Implement Naive, SES, Croston, SBA and TSB as short NumPy functions in
`src/pcsforecast/models/statistical.py`, each checked against hand-computed values in the tests.
statsforecast stays in the optional `models` extra as an external reference: a cross-check against
it is added before the freeze (F8).

## Consequences

- Every equation used in the thesis is visible in about 100 lines and covered by tests.
- The core image stays small and builds offline from the cache.
- Declared choices (initialisation at the first demand, TSB initial probability = share of
  non-zero periods, SES alpha chosen on the training window) are documented in the code and must be
  reported in the methodology.

## Update 2026-10-24: cross-check against statsforecast

The cross-check runs in three steps because statsforecast 2.1.1 requires `pandas<3` (ADR-0006):
`pcs reference-cases` writes real training windows (every selected series at 10 seeded validation
origins), `scripts/reference/statsforecast_reference.py` computes statsforecast's forecasts in an
isolated environment (`uv run --isolated --no-project --with statsforecast==2.1.1`), and
`pcs compare-reference` compares (`scripts/cross_check_statsforecast.sh` runs all three). The
recursions are compared at equal parameters: Croston and SBA at statsforecast's fixed alpha 0.1,
SES at the alpha the own SES selects, TSB at the selected parameters with statsforecast's
initialisation (`probability_init="first"`); the declared TSB initialisation is reported as the
only expected difference. Results: `docs/phases/f8a_pre_freeze_models.md`.
