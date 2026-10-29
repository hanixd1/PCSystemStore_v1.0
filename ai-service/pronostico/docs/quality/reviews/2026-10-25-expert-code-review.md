# Expert code review - 2026-10-25

- Reviewer: external specialist consulted by the owner before the expert validation.
- Scope: consistency between `Plan tesis.docx` and the code before the jury and the freeze.
- Method: every claim was checked in the code and the plan before any change.
- Outcome:
  - all six refinements are valid and applied, except item 5, which belongs to the owner;
  - one further gap was found during the check (item 7);
  - some function names in the review do not exist in the code, but the points behind them
    do apply.

| # | Claim | Verification | Resolution |
|---|---|---|---|
| 1 | Table 21 declares the sensitivity "precio medio del entrenamiento", and the code does not compute it | **Confirmed**, with a nuance. The primary "price known at the origin" was computed as the mean price of the training window, which is the sensitivity's definition, so the two coincided. | Primary = unit price of the latest period with sales in the window (`last_known_prices`). Sensitivity = mean price of the window (`mean_training_prices`), reported as `lost_value_sensitivity` with its unpriced units. Rules selected by `inventory.yaml`. Only the soles columns change. |
| 2 | Table 30 asks for preparation, fit and inference times; runs log one total per model (finding Q-4) | **Confirmed** (`execute_forecasts` does not exist; the timing lives in `runner/engine.py`). | `seconds_by_stage` per model: preparation (training views), fit (LightGBM training, Chronos fine-tuning; `None` for the statistical models, where fit and forecast are one recursion), inference (the rest; for LightGBM it includes building the features of each origin). |
| 3 | Table 17 declares the expanding window as a contrast; the runner cannot run it | **Confirmed** (`build_train_view` and `_select_window` do not exist; `TrainView.at` already supported expanding). | `pcs run-validation --condition expanding`; `pcs run-stats` adds it to the HE3 table next to the truncated history. |
| 4 | Table 15 and 2.6.2: months with sales and concentration in products and customers are not profiled | **Confirmed** (the profile lives in `series/profile.py`; `SeriesProfile` is its schema). | Profile adds `months_with_sales`, `customers`, `top_customer_share` and `top_sku_share`, computed on development lines. The pseudonymous customer code reaches the demand lines but never the panels. |
| 5 | `pcs check-privacy` exits 1 until the owner allow-lists ordinary words | **Confirmed**; the matches are product words that coincide with buyer nicknames. | Owner action: `pcs check-privacy --show-names` in the owner's own terminal, then add the confirmed words to `data/private/privacy_allowlist.txt`. The researcher's tools never print names. |
| 6 | No property-based tests of the origin cut and the simulator (finding Q-1) | **Confirmed**: Hypothesis covered only the F1 rules. | `tests/property/test_protocol_inventory_properties.py`: training views never expose a value after the origin (also with the future changed); validation targets stay inside development; the simulator conserves demand (served + lost), never serves more than demanded, never holds negative stock and bounds its orders. |
| 7 | Found during the check: Table 17 declares a 3-month horizon as a monthly sensitivity, and it was not evaluated | **Confirmed** (`sensitivity_horizons` was read by no module). | Validation evaluates the sensitivity horizons in a separate pass with fresh models, so the main horizons keep their results. The record lists both (`sensitivity_pass`), and every table carries the horizon. |

## Evidence that the results did not move

- **Series:** rebuilt; the development panel has the same SHA-256 as before
  (`e46f1643…`). Only the profile gains columns.
- **Weekly:** all 9 × 202,176 forecasts are identical to the previous run
  (`20261026T041019Z` vs `20261024T194830Z`, `pcs compare-runs`).
- **Monthly, first try:** evaluating the 3-month horizon together with the 1-month one changed
  the 1-month forecasts of three models (two-stage trees, global GBM, fine-tuned Chronos). These
  models train for the longest horizon they are asked for.
- **Monthly, fix:** sensitivity horizons now run in a separate pass with fresh models
  (`sensitivity_protocol`, recorded under `sensitivity_pass`). After the fix, all 124,416
  monthly 1-month forecasts are identical to the previous run. The 3-month horizon adds 93,312
  forecasts.
- **Price valuation:** at SKU level (weekly, L = 1, 95 %) lost sales sum to S/ 418,580 at the
  price known at the origin and S/ 416,506 at the mean training price.
- **Expanding contrast (HE3):**
  - weekly: changes MASE differently across models at SKU level (p < 1e-160), not at category
    level (p = 0.19 and 0.40);
  - monthly: SKU p < 1e-37, categories p = 0.05 and 0.27.
