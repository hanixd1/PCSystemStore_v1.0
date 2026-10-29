# ADR-0005 - Gradient-boosting models trained across the panel

- Status: accepted
- Date: 2026-10-21

## Context

Table 20 of the plan includes two machine-learning configurations: "trees in two stages" (an
occurrence classifier and a size regressor with lags and moving averages, Fu et al., 2026) and a
"global model" (gradient boosting over the whole panel with a series identifier, Montero-Manso and
Hyndman, 2021). Most SKU series have fewer than 20 sales in 52 weeks, too few to fit a tree model
per series, and a global model needs every series' history at the same origin.

## Decision

1. A second model interface, `PanelForecaster.forecast_panel(histories, horizon)`, receives the
   read-only training histories of **all** series cut at the same origin. The engine and the
   inventory simulator compute forecast paths for local and panel models through one function
   (`runner/paths.py`), so evaluation stays paired.
2. Features (`features/lagged.py`) are built from one history at a time: lags 1-4, means over 4, 8
   and 13 periods, share of periods with sales over 8, periods since the last sale, mean sale size
   and the horizon. Values and targets are divided by the history's mean so series of different
   size can be pooled. Direct multi-horizon design: one sample per (position, horizon) with
   `position + horizon <= origin`.
3. `TwoStageGBM`: binary occurrence model and size regressor on positive targets, pooled across
   series without identity; forecast = probability × size. `GlobalGBM`: one Tweedie (power 1.5)
   regressor with the series code as a categorical feature.
4. LightGBM moves to the core dependencies (it is now part of every run). Fixed, declared
   hyperparameters (learning rate 0.05, 15 leaves, 20 rows per leaf, 150 rounds, L2 1.0), fixed
   seed, `deterministic`, `force_row_wise` and 2 threads. A grid on internal origins is added
   before the freeze (F8). statsforecast/mlforecast move to an optional `reference` extra.
5. macOS needs `brew install libomp`; the Docker image installs `libgomp1`.

## Why direct and not recursive

A recursive strategy would feed the forecast for `t + 1` back as `lag_1` to forecast `t + 2`.
On intermittent demand those fed-back values are fractional, so `periods_since_sale` and the
occurrence share would describe a series that never existed (a "sale" of 0.3 units every period).
The direct design trains on observed targets only and passes the horizon as a feature, so every
feature is computed from real history (confirmed in the external review of 2026-10-21).

## Consequences

- Weekly validation over 315 series takes about 50 s (the statistical models take about 3 s).
- Tree models are the most likely place for host/container numerical differences; they are
  measured in each phase report and never rounded away (the container is the reference platform).
