# F6 - Inventory simulation and safety-stock calibration

- Date: 2026-10-21
- Plan phase: 5 machinery (inventory simulation, section 2.6.5), run on development data only
- Inputs consumed: `data/03_series` as recorded in `evidence/f2/manifest_03_series.json`;
  `configs/inventory.yaml` (Table 21).

## Goal

Translate each model's forecasts into replenishment decisions under one common policy and measure
service and stock (OE2), with the safety stock calibrated by the same rule for every model.

## Policy (plan 2.6.5, Table 21)

- Periodic review with order-up-to level, R = 1 period; lead time L = 1 (sensitivity L = 2);
  lost sales.
- Each period: receive due orders → serve observed demand from stock (unmet demand is lost) → at
  the end, order `ceil(max(0, S - position))`, available at the start of period `t + L + 1`.
- `S_t = F_t + m · σ_t`: `F_t` = the model's forecast of the next R + L periods made at origin t;
  `σ_t` = in-sample one-step naive RMSE of the training window × √(R + L), identical for every
  model; only the multiplier `m` is calibrated.
- Initial stock = target level at the first origin, nothing on order.
- Lost sales are valued at the price known at the origin (revenue not served, not lost profit);
  lost units without a known price are counted apart.
  - Update 2026-10-25 (expert review): the price known at the origin is now the unit price of
    the latest period with sales in the training window. Until then the primary used the mean
    price of the window, which is the Table 21 sensitivity. The mean training price is now
    reported apart as `lost_value_sensitivity`. Only the soles columns change; units, fill
    rate and stock do not.

## Calibration (plan 2.6.5)

The internal-validation origins of each series are split in halves. On the first half, the
smallest multiplier of the grid `0 … 3` whose simulated fill rate reaches the target (95 %; 90 %
and 99 % as sensitivity) is chosen per series and model; the policy is then evaluated with that
**fixed** multiplier on the second half. If no multiplier reaches the target, the largest one is
used and `target_reached = false` is recorded.

## Delivered

| Item | Location |
|---|---|
| Simulator and KPIs (fill rate, served, lost units and value, mean stock, mean safety stock, orders) | `inventory/simulator.py` |
| Calibrator | `inventory/calibrator.py` |
| `pcs simulate --frequency weekly|monthly` → `outputs/runs/<id>-inventory/simulation.parquet` + `run.json` | `inventory/run.py`, `cli.py` |
| Dashboard tab "Inventario": service vs. stock per level and model, scenario selector | `app/dashboard.py`, `reporting/dashboard_data.py` |

## Results (development span, not final-test results)

Details: `evidence/f6/simulation_summary.md`.

- Weekly, primary scenario (L = 1, 95 %): 315 series × 5 models × 4 scenarios in about 4 s.
- Categories: every model reaches 94.7-95.9 % aggregate fill rate on the evaluation half with
  7.4-8.2 units of mean stock per series.
- SKUs: aggregate fill rate 76-78 %; the target was reached in calibration for only 73-77 % of
  series, because most SKUs sell rarely and a flat forecast cannot anticipate a sporadic sale -
  the service-versus-accuracy trade-off that OE2 studies.

## Verification

| Check | Result | Evidence |
|---|---|---|
| Hand-computed simulation, safety stock, unpriced losses, zero-demand fill rate, calibration rule, Table 21 scenarios, spans, prices | pass | `tests/unit/test_inventory.py` |
| Property test (Hypothesis): served + lost = demand, no negative stock, 0 ≤ fill rate ≤ 1 | pass | `tests/unit/test_inventory.py` |
| Integration F1 → F6 on a synthetic year; unsupported review period refused | pass | `tests/integration/test_f2_f3_pipeline.py` |
| `make check` / Docker | 183 tests pass in both | `evidence/f6/tests_*.txt` |
| Host vs container | simulations identical | `evidence/f6/host_container_equivalence.txt` |
| Refactor for SonarQube | simulation identical before and after | - |
| SonarQube | gate passed after fixing 4 findings (duplicated literals, join parameters, complexity 16 > 15) | `evidence/f6/sonar_f6.txt` |

## Deviations

- Orders are whole units (`ceil`); demand and stock are in units, as in the record.
- Only R = 1 is implemented; other review periods are refused explicitly.
- Hyperparameters and the calibration split are fixed for now and frozen in F8.

## Handoff

The simulation reads only the development panel. In F9 the same code runs once on the sealed span
with the multipliers calibrated on the full development span.
