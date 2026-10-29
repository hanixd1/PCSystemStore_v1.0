# ADR-0012: Final-test harness, added after the freeze and before the opening

- Status: accepted
- Date: 2026-10-26

## Context

The freeze (`FREEZE.json`, tag `v1.0.0-research-freeze`, commit `fc96b66`) fixed the
configuration, the data and the models. It did not include the code that opens the test. Until
then the test panel was written and sealed, but no command read it: validation, inventory and
statistics only knew the development span.

Plan Table 17 defines the test: target dates in the last six complete months
(2026-03-01 to 2026-08-31), the same origin step, window and horizons as the internal
validation, and the same series, origins and horizons for every model. Plan 2.6.5 adds that the
safety-stock multiplier is calibrated on internal validation and then kept fixed for the test.

## Decision

The harness is added on top of the frozen commit, before the test is opened, and records which
commit opened it.

- **Origins** (`protocol/origins.py`, `final_test_origins`): every origin with a horizon whose
  target period is fully inside the test. A training view may include test periods that are
  already past, as in the rolling use of the forecast. Boundary periods that straddle the test
  start are history only; they are never targets.
- **Panel** (`final_test/panel.py`): the development panel plus the sealed panel, cut at the end
  of the test window and relabelled (development / excluded / test). The sealed panel is read
  only after `assert_unsealed` checks the freeze record and its configuration hashes, and only if
  its SHA-256 equals the one recorded at the freeze.
- **Inventory**: the multiplier is calibrated on every internal-validation origin of the
  development span (not only its first half, as in the F6 rehearsal), then applied, fixed, to
  the origins that serve the test periods. The simulation starts at the first test origin with
  stock at its target level.
- **Runs**: the existing validation, inventory and statistics steps take an optional
  `Evaluation`. Without it they behave exactly as before. Their records carry the stage, the
  test window, the freeze tag and commit, and `test_span_used = true`.
- **Single opening**: `scripts/open_test.sh` requires a clean working tree and passes the
  checked-out commit to `pcs run-final-test`. The command writes
  `data/04_manifests/TEST_OPENED.json` *before* the sealed panel is read, and refuses a second
  opening once one has completed. An attempt that fails is recorded as failed, with its error,
  and a retry is appended to the same record, so every access stays visible.
- **Rehearsal**: `pcs run-final-test --rehearsal` runs the same code on the development span,
  with its last six complete months standing in for the test. It writes no opening record and
  `test_span_used` stays false.

## Verification before the opening

- The configuration, lockfile, data and model code are those of the freeze. Since the tag, the
  only source changes are the harness itself and the optional `Evaluation` parameter of the
  validation, inventory, statistics and article steps.
- Development runs repeated with the harness in place reproduce the earlier runs exactly: every
  forecast and every inventory row (`docs/phases/evidence/f9/regression.md`).
- Unit and integration tests cover the origins, the spans, the rehearsal, every refusal (no
  commit, wrong commit, no freeze, altered sealed panel, second opening) and the single opening on
  the synthetic project.

## Consequences

- The opening is tied to a commit after the freeze tag. The article reports both commits and
  this decision as a deviation from the plan's phase order. The deviation concerns tooling only:
  no model, parameter, rule or datum changed.
- After the opening, `pcs freeze --check` reports `test_span_unused` as failed, by design.
