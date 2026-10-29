# ADR-0009: Chronos in a separate worker process; LightGBM imported lazily

- Status: accepted
- Date: 2026-10-24

## Context

Phase F5 adds Chronos-Bolt (PyTorch) to the same validation run as LightGBM. On macOS both bring
their own OpenMP runtime (PyTorch bundles one; LightGBM links Homebrew's `libomp`). In one process,
once either runtime has started, using the other aborts:

```
OMP: Error #15: Initializing libomp.dylib, but found libomp.dylib already initialized.
```

This happened in both orders (LightGBM training then PyTorch, and PyTorch then LightGBM). The
runtime's own workaround, `KMP_DUPLICATE_LIB_OK=TRUE`, is documented as able to "silently produce
incorrect results", which a research system cannot accept.

## Decision

- Chronos runs in a **separate worker process** started with `spawn` (`models/foundation.py`); the
  main process never imports PyTorch. Histories go to the worker and median forecasts come back.
- LightGBM is **imported only when a model is trained** (`models/gbm.py`), so the worker process,
  which re-imports the main module on start, never loads LightGBM's runtime.
- Tests inject a fake pipeline into the same class (no PyTorch, no weights); a fixture disables
  Chronos in every other test, so the host (with the `foundation` extra) and the container
  (without it) run the same tests.
- Weights are pinned (`amazon/chronos-bolt-small`, revision
  `772f3d25d38aec6d914c8949dab4462e2d46f5d8`, Apache-2.0) and cached in `models_cache/`
  (`HF_HOME`, ignored by Git); Hugging Face telemetry is disabled.

## Consequences

- Verified: LightGBM trains in the main process and Chronos then forecasts in the worker without
  error, with forecasts identical to an in-process run.
- One extra process per run that uses Chronos (start-up of a few seconds).
- Without the `foundation` extra, Chronos is reported in `not_implemented` instead of failing.
