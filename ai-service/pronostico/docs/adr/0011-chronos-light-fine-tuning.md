# ADR-0011: Chronos light fine-tuning with a reserved internal validation and quarterly refits

- Status: accepted
- Date: 2026-10-24

## Context

Table 20 lists a second pretrained configuration, "Ajuste ligero: ajuste con el entrenamiento y
validación interna reservada" (Li et al., 2025). chronos-forecasting 2.3.2 offers a training API
only for Chronos-2, not for Chronos-Bolt, the model used zero-shot (ADR-0009). Fine-tuning at
every origin would cost about 35 s per origin on the laptop CPU (60 weekly origins per run, three
runs per frequency).

## Decision

- Own short training loop (`models/foundation.py`, `fine_tune`) on the Chronos-Bolt model's own
  quantile loss, starting from the same pinned weights as zero-shot: AdamW, learning rate 1e-5,
  batches of 32 windows, at most 1,000 steps (the published defaults of AutoGluon's Chronos
  fine-tuning), seed fixed.
- **Reserved internal validation**: the last `horizon` periods of every training history are held
  out; training windows have targets that end before them. The validation loss is checked every
  25 steps; training stops after 4 checks without improvement and the best checked weights are
  kept. Step 0 (the zero-shot weights) is a candidate, so the fine-tuned model is never worse than
  zero-shot on the reserve.
- Windows with a constant context are skipped: Chronos scales by the context's standard deviation,
  which is then zero, and one such window dominated the loss (observed on the development panel:
  validation loss 7,787 with them, 1.58 without).
- **Refit cadence**: every 13 weekly or 3 monthly origins (one quarter), with the histories of that
  origin only; the origins in between use the latest fit. The cadence and the minimum context
  (13 weeks, 6 months) are declared in `models.yaml` (`params_by_frequency`).
- Fine-tuning runs in the Chronos worker process (ADR-0009); each refit's report (windows, steps,
  best step, losses, seconds) goes to the run record (`model_details`).
- No search over these settings (they are declared, not tuned).

## Consequences

- No leakage: a refit sees only training histories up to its origin, and later origins are
  forecast with an older fit (conservative).
- Deterministic: two fits with the same inputs give identical losses and weights (checked on the
  development panel and in the tests).
- Cost: about 35 s (weekly) to 47 s (monthly) per refit; 5 weekly and 3 monthly refits per run.
- The real training loop is tested on a tiny randomly initialised Chronos-Bolt in a separate
  process (PyTorch cannot share a process with LightGBM, ADR-0009); coverage measures it through
  `coverage` subprocess patching.
