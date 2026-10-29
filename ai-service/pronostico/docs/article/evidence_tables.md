# Evidence tables for the article

Generated 2026-10-26T18:00:45+00:00 by `pcs article-tables` from the audit reports, manifests, run records and statistics tables. Channel: total demand. Results describe the development span until the final test is opened.

## Table A1. Vecinos sales record: rows, deterministic exclusions and reconciliation

| step | count |
|---|---|
| Daily sheets read | 569 |
| Rows read | 6003 |
| Excluded by rule R201 | 887 |
| Excluded by rule R202 | 16 |
| Excluded by rule R203 | 7 |
| Excluded by rule R209 | 6 |
| Valid lines | 5087 |
| Valid units | 5576 |
| Valid lines without amount | 283 |
| Daily blocks: match | 564 |
| Daily blocks: mismatch | 1 |
| Daily blocks: no total row | 1 |
| Daily blocks: total not numeric | 1 |

## Table A2. Fiscal receipts: reconciliation with the printed totals

| measure | value |
|---|---|
| Receipt files | 1151 |
| Valid receipts | 1151 |
| Item lines | 3681 |
| Receipts reproducing their printed total | 1151 |
| Largest reconciliation gap (S/) | 0.0050 |
| Delivered share of the numbering | 0.6416 |

## Table A3. Catalog and panel

| measure | value |
|---|---|
| SKUs in the catalog | 2067 |
| SKUs in the panel | 442 |
| Panel share of development units | 0.8000 |
| Structural break | 2025-05-01 |
| Receipt lines possibly also in the vecinos record | 637 |

## Table A4. Series evaluated per frequency, channel and level

| frequency | channel | level | series |
|---|---|---|---|
| monthly | facturado | category | 14 |
| monthly | facturado | sku | 405 |
| monthly | facturado | total | 1 |
| monthly | total | category | 14 |
| monthly | total | sku | 442 |
| monthly | total | total | 1 |
| monthly | total_dedup | category | 14 |
| monthly | total_dedup | sku | 442 |
| monthly | total_dedup | total | 1 |
| monthly | vecinos | category | 14 |
| monthly | vecinos | sku | 379 |
| monthly | vecinos | total | 1 |
| weekly | facturado | category | 14 |
| weekly | facturado | sku | 405 |
| weekly | facturado | total | 1 |
| weekly | total | category | 14 |
| weekly | total | sku | 442 |
| weekly | total | total | 1 |
| weekly | total_dedup | category | 14 |
| weekly | total_dedup | sku | 442 |
| weekly | total_dedup | total | 1 |
| weekly | vecinos | category | 14 |
| weekly | vecinos | sku | 379 |
| weekly | vecinos | total | 1 |

## Table B1. Rolling-origin evaluation and sealed test span

| frequency | record | sealed test | minimum training | window | contrasts | horizons | sensitivity horizons | origins | first origin | last origin | test span used |
|---|---|---|---|---|---|---|---|---|---|---|---|
| weekly | 2024-01-03 to 2026-09-14 | 2026-03-01 to 2026-08-31 | 52 | rolling, 52 | truncated (rolling, 26); expanding (all history) | [1, 4] | none | 60 | 2024-12-23 | 2026-02-09 | no |
| monthly | 2024-01-03 to 2026-09-14 | 2026-03-01 to 2026-08-31 | 18 | rolling, 18 | truncated (rolling, 9); expanding (all history) | [1] | [3] | 8 | 2025-06-01 | 2026-01-01 | no |

## Table C1. Software, hardware and pinned pretrained weights

| item | value |
|---|---|
| Python | 3.14.9 |
| pcsforecast | 0.1.0 |
| numpy | 2.5.4 |
| pandas | 3.0.6 |
| pyarrow | 26.0.0 |
| pydantic | 2.14.1 |
| pandera | 0.34.1 |
| lightgbm | 4.7.0 |
| torch | 2.14.1 |
| chronos-forecasting | 2.3.2 |
| scipy | 1.18.1 |
| Machine | Darwin arm64 |
| CPU cores | 10 |
| Memory (GB) | 16 |
| Peak memory of the run (MB) | 1680.5 (main process), 2303.9 (Chronos worker) |
| chronos_zero_shot weights | amazon/chronos-bolt-small@772f3d25d38aec6d914c8949dab4462e2d46f5d8 |
| chronos_fine_tuned weights | amazon/chronos-bolt-small@772f3d25d38aec6d914c8949dab4462e2d46f5d8 |

## Table C2. Configuration files (SHA-256 prefix)

| file | sha256 |
|---|---|
| protocol.yaml | 01dc819304f071c7 |
| inventory.yaml | 8d08adc2c52ab03d |
| models.yaml | 295b46e8fae4001d |
| data_rules.yaml | a7e3a5a1ed0619f1 |
| sheet_date_overrides.yaml | 58d35561a61926aa |
| catalog.yaml | fd4da59ef7ab00d0 |
| series.yaml | 0fc61648983128e9 |
| price_links.yaml | b9b949883252acd8 |
| stats.yaml | e879c02f9fa78528 |
| tuning.yaml | b35083102b4dbbe8 |
| tuned.yaml | c7b533a81db20d0b |

## Table C3. Effective hyperparameters and seeds

| frequency | model | parameters |
|---|---|---|
| weekly | naive | none |
| weekly | ses | none |
| weekly | croston | alpha = 0.15 |
| weekly | sba | alpha = 0.3 |
| weekly | tsb | alpha_d = 0.3, alpha_p = 0.3 |
| weekly | two_stage_trees | learning_rate = 0.03, min_data_in_leaf = 50, num_leaves = 31, rounds = 200, seed = 20260101 |
| weekly | global_gbm | learning_rate = 0.05, min_data_in_leaf = 50, num_leaves = 31, rounds = 200, seed = 20260101 |
| weekly | chronos_zero_shot | batch_size = 256 |
| weekly | chronos_fine_tuned | batch_size = 256, eval_every = 25, learning_rate = 1e-05, max_steps = 1000, min_context = 13, patience = 4, refit_every = 13, seed = 20261024, train_batch = 32 |
| monthly | naive | none |
| monthly | ses | none |
| monthly | croston | alpha = 0.2 |
| monthly | sba | alpha = 0.3 |
| monthly | tsb | alpha_d = 0.3, alpha_p = 0.3 |
| monthly | two_stage_trees | learning_rate = 0.05, min_data_in_leaf = 50, num_leaves = 15, rounds = 100, seed = 20260101 |
| monthly | global_gbm | learning_rate = 0.05, min_data_in_leaf = 50, num_leaves = 31, rounds = 200, seed = 20260101 |
| monthly | chronos_zero_shot | batch_size = 256 |
| monthly | chronos_fine_tuned | batch_size = 256, eval_every = 25, learning_rate = 1e-05, max_steps = 1000, min_context = 6, patience = 4, refit_every = 3, seed = 20261024, train_batch = 32 |

## Table D1 (Weekly). MASE by horizon, level and model (development span)

| horizon | level | model | mean MASE | median MASE | series |
|---|---|---|---|---|---|
| 1 | category | chronos_fine_tuned | 0.6257 | 0.6572 | 14 |
| 1 | category | chronos_zero_shot | 0.6420 | 0.6602 | 14 |
| 1 | category | croston | 0.6862 | 0.7046 | 14 |
| 1 | category | global_gbm | 0.7718 | 0.7723 | 14 |
| 1 | category | naive | 0.8118 | 0.8196 | 14 |
| 1 | category | sba | 0.6442 | 0.6846 | 14 |
| 1 | category | ses | 0.6916 | 0.6997 | 14 |
| 1 | category | tsb | 0.6829 | 0.7106 | 14 |
| 1 | category | two_stage_trees | 0.8412 | 0.8082 | 14 |
| 1 | sku | chronos_fine_tuned | 0.8285 | 0.4235 | 442 |
| 1 | sku | chronos_zero_shot | 1.0224 | 0.4343 | 442 |
| 1 | sku | croston | 2.6602 | 1.6605 | 442 |
| 1 | sku | global_gbm | 1.0589 | 0.6624 | 442 |
| 1 | sku | naive | 1.2628 | 0.6632 | 442 |
| 1 | sku | sba | 2.4067 | 1.5387 | 442 |
| 1 | sku | ses | 1.2140 | 0.7667 | 442 |
| 1 | sku | tsb | 1.2201 | 0.6725 | 442 |
| 1 | sku | two_stage_trees | 10.6305 | 1.3697 | 442 |
| 1 | total | chronos_fine_tuned | 0.6782 | 0.6782 | 1 |
| 1 | total | chronos_zero_shot | 0.7036 | 0.7036 | 1 |
| 1 | total | croston | 0.7693 | 0.7693 | 1 |
| 1 | total | global_gbm | 1.1296 | 1.1296 | 1 |
| 1 | total | naive | 0.7868 | 0.7868 | 1 |
| 1 | total | sba | 0.7314 | 0.7314 | 1 |
| 1 | total | ses | 0.7555 | 0.7555 | 1 |
| 1 | total | tsb | 0.7485 | 0.7485 | 1 |
| 1 | total | two_stage_trees | 1.3998 | 1.3998 | 1 |
| 4 | category | chronos_fine_tuned | 0.6551 | 0.6804 | 14 |
| 4 | category | chronos_zero_shot | 0.6918 | 0.7008 | 14 |
| 4 | category | croston | 0.7132 | 0.7231 | 14 |
| 4 | category | global_gbm | 0.8086 | 0.8012 | 14 |
| 4 | category | naive | 0.8453 | 0.8466 | 14 |
| 4 | category | sba | 0.6609 | 0.6736 | 14 |
| 4 | category | ses | 0.7179 | 0.7282 | 14 |
| 4 | category | tsb | 0.7156 | 0.7220 | 14 |
| 4 | category | two_stage_trees | 0.8607 | 0.8136 | 14 |
| 4 | sku | chronos_fine_tuned | 0.9695 | 0.3720 | 441 |
| 4 | sku | chronos_zero_shot | 1.1025 | 0.3871 | 441 |
| 4 | sku | croston | 2.7712 | 1.6412 | 441 |
| 4 | sku | global_gbm | 1.2023 | 0.6572 | 441 |
| 4 | sku | naive | 1.4086 | 0.6675 | 441 |
| 4 | sku | sba | 2.5234 | 1.5697 | 441 |
| 4 | sku | ses | 1.4300 | 0.7433 | 441 |
| 4 | sku | tsb | 1.3835 | 0.6892 | 441 |
| 4 | sku | two_stage_trees | 14.1204 | 1.3490 | 441 |
| 4 | total | chronos_fine_tuned | 0.7470 | 0.7470 | 1 |
| 4 | total | chronos_zero_shot | 0.8326 | 0.8326 | 1 |
| 4 | total | croston | 0.8050 | 0.8050 | 1 |
| 4 | total | global_gbm | 1.2107 | 1.2107 | 1 |
| 4 | total | naive | 0.8739 | 0.8739 | 1 |
| 4 | total | sba | 0.6967 | 0.6967 | 1 |
| 4 | total | ses | 0.8122 | 0.8122 | 1 |
| 4 | total | tsb | 0.7857 | 0.7857 | 1 |
| 4 | total | two_stage_trees | 1.3709 | 1.3709 | 1 |

## Table D2 (Weekly). Friedman test and Nemenyi critical difference

| level | horizon | statistic | p_value | series | models | mean_ranks | critical_difference |
|---|---|---|---|---|---|---|---|
| category | 1 | 73.2381 | 1.111e-12 | 14 | 9 | {"chronos_fine_tuned": 1.7857142857142858, "sba": 2.7142857142857144, "chronos_zero_shot": 2.9285714285714284, "tsb": 4.785714285714286, "croston": 5.071428571428571, "ses": 5.357142857142857, "global_gbm": 6.571428571428571, "two_stage_trees": 7.857142857142857, "naive": 7.928571428571429} | 3.2106 |
| category | 4 | 59.5619 | 5.681e-10 | 14 | 9 | {"chronos_fine_tuned": 2.2857142857142856, "sba": 2.5, "chronos_zero_shot": 3.5, "croston": 4.785714285714286, "ses": 5.0, "tsb": 5.071428571428571, "global_gbm": 6.857142857142857, "two_stage_trees": 7.357142857142857, "naive": 7.642857142857143} | 3.2106 |
| sku | 1 | 1809.4878 | 0 | 442 | 9 | {"chronos_fine_tuned": 1.8235294117647058, "chronos_zero_shot": 3.076923076923077, "naive": 3.9524886877828056, "tsb": 4.4389140271493215, "global_gbm": 4.524886877828054, "ses": 5.52262443438914, "sba": 6.85972850678733, "croston": 7.298642533936651, "two_stage_trees": 7.502262443438914} | 0.5714 |
| sku | 4 | 1666.9836 | 0 | 441 | 9 | {"chronos_fine_tuned": 1.9365079365079365, "chronos_zero_shot": 3.0090702947845807, "naive": 4.145124716553288, "global_gbm": 4.421768707482993, "tsb": 4.5895691609977325, "ses": 5.603174603174603, "sba": 6.750566893424036, "croston": 7.190476190476191, "two_stage_trees": 7.35374149659864} | 0.5720 |

## Table D3 (Weekly). Diebold-Mariano tests per series (Holm-adjusted)

| horizon | model_a | model_b | series_tested | a_better | b_better | median_statistic |
|---|---|---|---|---|---|---|
| 1 | ses | naive | 457 | 0 | 34 | -0.9742 |
| 1 | croston | naive | 457 | 0 | 24 | -0.2422 |
| 1 | sba | naive | 457 | 0 | 36 | -0.4655 |
| 1 | tsb | naive | 457 | 0 | 0 | -0.9312 |
| 1 | two_stage_trees | naive | 457 | 0 | 134 | 1.1448 |
| 1 | global_gbm | naive | 457 | 0 | 3 | -0.8961 |
| 1 | chronos_zero_shot | naive | 457 | 0 | 33 | -1.0008 |
| 1 | chronos_fine_tuned | naive | 457 | 0 | 32 | -0.9999 |
| 1 | sba | croston | 457 | 33 | 16 | -1.5585 |
| 1 | tsb | croston | 457 | 36 | 0 | -1.3702 |
| 1 | global_gbm | two_stage_trees | 457 | 164 | 0 | -2.4773 |
| 1 | chronos_fine_tuned | chronos_zero_shot | 457 | 5 | 0 | -0.6529 |
| 4 | ses | naive | 456 | 1 | 0 | -0.9850 |
| 4 | croston | naive | 456 | 1 | 10 | -0.5632 |
| 4 | sba | naive | 455 | 1 | 9 | -0.6712 |
| 4 | tsb | naive | 455 | 1 | 0 | -0.9913 |
| 4 | two_stage_trees | naive | 457 | 0 | 0 | 0.7706 |
| 4 | global_gbm | naive | 457 | 0 | 0 | -0.9827 |
| 4 | chronos_zero_shot | naive | 457 | 1 | 3 | -1.0041 |
| 4 | chronos_fine_tuned | naive | 457 | 0 | 0 | -1.0042 |
| 4 | sba | croston | 456 | 5 | 2 | -1.1048 |
| 4 | tsb | croston | 452 | 11 | 1 | -0.9647 |
| 4 | global_gbm | two_stage_trees | 457 | 1 | 0 | -1.3562 |
| 4 | chronos_fine_tuned | chronos_zero_shot | 455 | 0 | 0 | -0.8434 |

## Table D4 (Weekly). Inventory simulation, primary scenario

| level | model | fill_rate | mean_on_hand | mean_safety_stock | lost_units | lost_value | target_reached |
|---|---|---|---|---|---|---|---|
| category | chronos_fine_tuned | 0.9877 | 12.3929 | 12.0177 | 26 | 10661.1426 | 0.8571 |
| category | chronos_zero_shot | 0.9914 | 13.1310 | 11.3649 | 18 | 7418.2368 | 0.8571 |
| category | croston | 0.9859 | 10.9167 | 9.2474 | 35 | 11165.4524 | 0.8571 |
| category | global_gbm | 0.9836 | 11.9524 | 8.4493 | 30 | 14583.4486 | 0.8571 |
| category | naive | 0.9845 | 12.3714 | 8.6342 | 20 | 16625.5332 | 1 |
| category | sba | 0.9896 | 12.5548 | 12.2819 | 20 | 7677.8070 | 0.8571 |
| category | ses | 0.9834 | 11.4119 | 9.7149 | 32 | 11849.1372 | 0.8571 |
| category | tsb | 0.9867 | 11.2405 | 9.8941 | 23 | 8825.1730 | 0.8571 |
| category | two_stage_trees | 0.9910 | 13.5214 | 8.3508 | 19 | 7934.3046 | 0.8571 |
| sku | chronos_fine_tuned | 0.9133 | 1.9498 | 1.3274 | 207 | 51067.3161 | 0.7285 |
| sku | chronos_zero_shot | 0.9385 | 2.1630 | 1.2096 | 155 | 43327.3066 | 0.7986 |
| sku | croston | 0.9202 | 2.7754 | 1.2348 | 205 | 50284.9762 | 0.7376 |
| sku | global_gbm | 0.9364 | 2.1460 | 1.1720 | 169 | 52198.9859 | 0.7896 |
| sku | naive | 0.9062 | 2.2095 | 1.0236 | 177 | 35053.8566 | 0.7738 |
| sku | sba | 0.9192 | 2.5968 | 1.2371 | 201 | 49869.8100 | 0.7353 |
| sku | ses | 0.9197 | 2.0075 | 1.1813 | 189 | 46719.8069 | 0.7466 |
| sku | tsb | 0.9214 | 2.0170 | 1.1473 | 185 | 38587.8220 | 0.7557 |
| sku | two_stage_trees | 0.9456 | 2.5305 | 0.9954 | 149 | 51469.7858 | 0.8665 |
| total | chronos_fine_tuned | 0.9985 | 44.6333 | 40.5102 | 2 | 793.6846 | 1 |
| total | chronos_zero_shot | 0.9947 | 42.9333 | 27.0068 | 7 | 2777.8962 | 1 |
| total | croston | 0.9901 | 38.1333 | 27.0068 | 13 | 3880.5458 | 1 |
| total | global_gbm | 0.9947 | 57.2000 | 13.5034 | 7 | 2777.8962 | 1 |
| total | naive | 1 | 65.1667 | 54.0136 | 0 | 0 | 1 |
| total | sba | 0.9985 | 45.1000 | 54.0136 | 2 | 474.0836 | 1 |
| total | ses | 0.9810 | 33.2000 | 27.0068 | 25 | 8488.7765 | 1 |
| total | tsb | 0.9788 | 32.8667 | 27.0068 | 28 | 9519.5029 | 1 |
| total | two_stage_trees | 1 | 89.3667 | 13.5034 | 0 | 0 | 1 |

## Table D5 (Weekly). Spearman between the MASE and fill-rate rankings

| level | rho | ci_low | ci_high | resamples | models | below_threshold |
|---|---|---|---|---|---|---|
| category | 0.4500 | -0.4167 | 0.5933 | 1000 | 9 | no |
| sku | -0.3500 | -0.5167 | 0 | 1000 | 9 | yes |
| total | -0.2363 | -0.2363 | -0.2363 | 1000 | 9 | yes |

## Table D6 (Weekly). HE3 robustness: break, truncated history, expanding window

| condition | level | horizon | statistic | p_value | series |
|---|---|---|---|---|---|
| break | category | 1 | 62.8571 | 1.278e-10 | 14 |
| break | category | 4 | 51.5429 | 2.062e-08 | 14 |
| break | sku | 1 | 726.3345 | 1.528e-151 | 224 |
| break | sku | 4 | 637.8814 | 1.671e-132 | 221 |
| truncated | category | 1 | 32.1905 | 8.61e-05 | 14 |
| truncated | category | 4 | 27.8857 | 0.0005 | 14 |
| truncated | sku | 1 | 396.6101 | 9.946e-81 | 313 |
| truncated | sku | 4 | 458.5147 | 5.537e-94 | 312 |
| expanding | category | 1 | 11.2381 | 0.1886 | 14 |
| expanding | category | 4 | 8.4000 | 0.3954 | 14 |
| expanding | sku | 1 | 824.6530 | 9.991e-173 | 313 |
| expanding | sku | 4 | 791.1906 | 1.629e-165 | 312 |

## Table D1 (Monthly). MASE by horizon, level and model (development span)

| horizon | level | model | mean MASE | median MASE | series |
|---|---|---|---|---|---|
| 1 | category | chronos_fine_tuned | 0.4931 | 0.5350 | 14 |
| 1 | category | chronos_zero_shot | 0.5346 | 0.5164 | 14 |
| 1 | category | croston | 0.7676 | 0.7712 | 14 |
| 1 | category | global_gbm | 0.8604 | 0.9349 | 14 |
| 1 | category | naive | 0.6074 | 0.6109 | 14 |
| 1 | category | sba | 0.5084 | 0.5372 | 14 |
| 1 | category | ses | 0.5543 | 0.5336 | 14 |
| 1 | category | tsb | 0.6187 | 0.5918 | 14 |
| 1 | category | two_stage_trees | 1.0967 | 1.1325 | 14 |
| 1 | sku | chronos_fine_tuned | 1.1601 | 0.0341 | 441 |
| 1 | sku | chronos_zero_shot | 1.2316 | 0.1041 | 441 |
| 1 | sku | croston | 3.0229 | 1.4542 | 441 |
| 1 | sku | global_gbm | 2.0621 | 0.3508 | 441 |
| 1 | sku | naive | 1.2663 | 0 | 441 |
| 1 | sku | sba | 2.7508 | 1.3516 | 441 |
| 1 | sku | ses | 1.3958 | 0.4004 | 441 |
| 1 | sku | tsb | 1.3800 | 0.4001 | 441 |
| 1 | sku | two_stage_trees | 3.6826 | 0.7851 | 441 |
| 1 | total | chronos_fine_tuned | 0.3785 | 0.3785 | 1 |
| 1 | total | chronos_zero_shot | 0.5285 | 0.5285 | 1 |
| 1 | total | croston | 0.9383 | 0.9383 | 1 |
| 1 | total | global_gbm | 1.1575 | 1.1575 | 1 |
| 1 | total | naive | 0.4191 | 0.4191 | 1 |
| 1 | total | sba | 0.3807 | 0.3807 | 1 |
| 1 | total | ses | 0.5341 | 0.5341 | 1 |
| 1 | total | tsb | 0.6047 | 0.6047 | 1 |
| 1 | total | two_stage_trees | 1.5435 | 1.5435 | 1 |
| 3 | category | chronos_fine_tuned | 0.5560 | 0.4430 | 14 |
| 3 | category | chronos_zero_shot | 0.6212 | 0.5670 | 14 |
| 3 | category | croston | 0.8370 | 0.7793 | 14 |
| 3 | category | global_gbm | 1.2243 | 1.2771 | 14 |
| 3 | category | naive | 0.5374 | 0.5175 | 14 |
| 3 | category | sba | 0.5230 | 0.4650 | 14 |
| 3 | category | ses | 0.5561 | 0.5846 | 14 |
| 3 | category | tsb | 0.6824 | 0.6445 | 14 |
| 3 | category | two_stage_trees | 1.3779 | 1.2482 | 14 |
| 3 | sku | chronos_fine_tuned | 1.9668 | 0.0630 | 435 |
| 3 | sku | chronos_zero_shot | 2.0916 | 0.1836 | 435 |
| 3 | sku | croston | 3.7174 | 1.2512 | 435 |
| 3 | sku | global_gbm | 2.0643 | 0.2247 | 435 |
| 3 | sku | naive | 2.4543 | 0 | 435 |
| 3 | sku | sba | 3.4699 | 1.1827 | 435 |
| 3 | sku | ses | 2.3480 | 0.4292 | 435 |
| 3 | sku | tsb | 2.3763 | 0.4515 | 435 |
| 3 | sku | two_stage_trees | 4.7617 | 0.7039 | 435 |
| 3 | total | chronos_fine_tuned | 0.5346 | 0.5346 | 1 |
| 3 | total | chronos_zero_shot | 0.7166 | 0.7166 | 1 |
| 3 | total | croston | 1.1480 | 1.1480 | 1 |
| 3 | total | global_gbm | 1.7337 | 1.7337 | 1 |
| 3 | total | naive | 0.2935 | 0.2935 | 1 |
| 3 | total | sba | 0.4427 | 0.4427 | 1 |
| 3 | total | ses | 0.5839 | 0.5839 | 1 |
| 3 | total | tsb | 0.8081 | 0.8081 | 1 |
| 3 | total | two_stage_trees | 1.9598 | 1.9598 | 1 |

## Table D2 (Monthly). Friedman test and Nemenyi critical difference

| level | horizon | statistic | p_value | series | models | mean_ranks | critical_difference |
|---|---|---|---|---|---|---|---|
| category | 1 | 36.5524 | 1.391e-05 | 14 | 9 | {"sba": 2.7857142857142856, "chronos_fine_tuned": 3.142857142857143, "chronos_zero_shot": 4.214285714285714, "ses": 4.428571428571429, "tsb": 4.785714285714286, "naive": 5.428571428571429, "croston": 5.928571428571429, "global_gbm": 7.071428571428571, "two_stage_trees": 7.214285714285714} | 3.2106 |
| category | 3 | 28.6476 | 0.0004 | 14 | 9 | {"sba": 3.142857142857143, "naive": 4.071428571428571, "chronos_fine_tuned": 4.142857142857143, "chronos_zero_shot": 4.142857142857143, "ses": 4.357142857142857, "tsb": 5.071428571428571, "croston": 6.142857142857143, "global_gbm": 6.714285714285714, "two_stage_trees": 7.214285714285714} | 3.2106 |
| sku | 1 | 1277.0903 | 2.103e-270 | 441 | 9 | {"chronos_fine_tuned": 2.6904761904761907, "naive": 3.0430839002267573, "chronos_zero_shot": 3.824263038548753, "global_gbm": 4.2811791383219955, "ses": 5.344671201814059, "tsb": 5.471655328798186, "two_stage_trees": 6.1519274376417235, "sba": 6.786848072562358, "croston": 7.405895691609977} | 0.5720 |
| sku | 3 | 1138.2795 | 2.068e-240 | 435 | 9 | {"chronos_fine_tuned": 3.0011494252873563, "naive": 3.3195402298850576, "global_gbm": 3.6482758620689655, "chronos_zero_shot": 4.070114942528735, "ses": 5.44367816091954, "tsb": 5.464367816091954, "two_stage_trees": 5.852873563218391, "sba": 6.827586206896552, "croston": 7.372413793103449} | 0.5760 |

## Table D3 (Monthly). Diebold-Mariano tests per series (Holm-adjusted)

| horizon | model_a | model_b | series_tested | a_better | b_better | median_statistic |
|---|---|---|---|---|---|---|
| 1 | ses | naive | 456 | 0 | 23 | 1.0029 |
| 1 | croston | naive | 456 | 0 | 15 | 1.5233 |
| 1 | sba | naive | 456 | 0 | 47 | 1.4780 |
| 1 | tsb | naive | 456 | 0 | 0 | 1.6066 |
| 1 | two_stage_trees | naive | 457 | 0 | 6 | 1.6035 |
| 1 | global_gbm | naive | 457 | 0 | 0 | 1.0967 |
| 1 | chronos_zero_shot | naive | 452 | 0 | 0 | 1.0531 |
| 1 | chronos_fine_tuned | naive | 443 | 0 | 0 | 1 |
| 1 | sba | croston | 456 | 1 | 15 | -1.3388 |
| 1 | tsb | croston | 456 | 11 | 0 | -1.3956 |
| 1 | global_gbm | two_stage_trees | 457 | 6 | 0 | -1.5692 |
| 1 | chronos_fine_tuned | chronos_zero_shot | 457 | 0 | 0 | -0.9788 |
| 3 | ses | naive | 396 | 4 | 2 | 0.7539 |
| 3 | croston | naive | 378 | 0 | 7 | 1.4939 |
| 3 | sba | naive | 374 | 1 | 16 | 1.4694 |
| 3 | tsb | naive | 402 | 2 | 0 | 0.9821 |
| 3 | two_stage_trees | naive | 395 | 4 | 1 | 0.9432 |
| 3 | global_gbm | naive | 397 | 5 | 6 | 0.8017 |
| 3 | chronos_zero_shot | naive | 382 | 6 | 15 | 0.7728 |
| 3 | chronos_fine_tuned | naive | 386 | 10 | 4 | 0.7810 |
| 3 | sba | croston | 389 | 3 | 2 | -0.8555 |
| 3 | tsb | croston | 390 | 5 | 1 | -0.8702 |
| 3 | global_gbm | two_stage_trees | 407 | 1 | 0 | -0.9506 |
| 3 | chronos_fine_tuned | chronos_zero_shot | 399 | 21 | 1 | -0.7148 |

## Table D4 (Monthly). Inventory simulation, primary scenario

| level | model | fill_rate | mean_on_hand | mean_safety_stock | lost_units | lost_value | target_reached |
|---|---|---|---|---|---|---|---|
| category | chronos_fine_tuned | 0.9117 | 14.5536 | 11.9513 | 57 | 51643.2479 | 1 |
| category | chronos_zero_shot | 0.9427 | 17.4643 | 9.9014 | 28 | 37367.7318 | 1 |
| category | croston | 0.9777 | 18.7857 | 2.9009 | 10 | 16800.9058 | 1 |
| category | global_gbm | 0.9743 | 29.8393 | 3.5734 | 5 | 517.9983 | 1 |
| category | naive | 0.9396 | 20.7143 | 13.3063 | 28 | 33319.3184 | 1 |
| category | sba | 0.9246 | 13.8571 | 6.8265 | 38 | 41170.0525 | 1 |
| category | ses | 0.9355 | 14.5000 | 5.9898 | 29 | 37354.3679 | 1 |
| category | tsb | 0.9497 | 15.3393 | 4.0381 | 21 | 26940.8119 | 1 |
| category | two_stage_trees | 0.9808 | 33.4643 | 3.1497 | 4 | 381.3317 | 1 |
| sku | chronos_fine_tuned | 0.9215 | 1.4208 | 0.9334 | 152 | 35861.1432 | 0.9118 |
| sku | chronos_zero_shot | 0.9246 | 1.5509 | 0.7573 | 134 | 34780.6125 | 0.9299 |
| sku | croston | 0.9382 | 3.2104 | 0.7300 | 135 | 30876.4705 | 0.9140 |
| sku | global_gbm | 0.9356 | 1.7947 | 0.8224 | 140 | 37275.5923 | 0.9231 |
| sku | naive | 0.9004 | 1.3507 | 0.7481 | 136 | 29119.3074 | 0.9208 |
| sku | sba | 0.9352 | 2.9174 | 0.7461 | 138 | 31252.4751 | 0.9140 |
| sku | ses | 0.9349 | 1.6782 | 0.5988 | 131 | 30880.5569 | 0.9208 |
| sku | tsb | 0.9371 | 1.7545 | 0.5848 | 125 | 28859.1950 | 0.9208 |
| sku | two_stage_trees | 0.9558 | 2.4135 | 0.5927 | 96 | 26753.4380 | 0.9706 |
| total | chronos_fine_tuned | 0.9008 | 90 | 0 | 70 | 33454.8805 | 1 |
| total | chronos_zero_shot | 1 | 188 | 81.2486 | 0 | 0 | 1 |
| total | croston | 1 | 210.2500 | 0 | 0 | 0 | 1 |
| total | global_gbm | 1 | 391.7500 | 0 | 0 | 0 | 1 |
| total | naive | 1 | 188.7500 | 121.8730 | 0 | 0 | 1 |
| total | sba | 0.9674 | 84 | 0 | 23 | 10992.3179 | 1 |
| total | ses | 0.9448 | 99.7500 | 0 | 39 | 18639.1477 | 1 |
| total | tsb | 1 | 140 | 0 | 0 | 0 | 1 |
| total | two_stage_trees | 1 | 447 | 0 | 0 | 0 | 1 |

## Table D5 (Monthly). Spearman between the MASE and fill-rate rankings

| level | rho | ci_low | ci_high | resamples | models | below_threshold |
|---|---|---|---|---|---|---|
| category | -0.8833 | -0.9791 | 0.0174 | 1000 | 9 | yes |
| sku | -0.8833 | -0.9333 | -0.5333 | 1000 | 9 | yes |
| total | -0.6436 | -0.6436 | -0.6436 | 1000 | 9 | yes |

## Table D6 (Monthly). HE3 robustness: break, truncated history, expanding window

| condition | level | horizon | statistic | p_value | series |
|---|---|---|---|---|---|
| truncated | category | 1 | 27.2762 | 0.0006 | 14 |
| truncated | category | 3 | 12.2095 | 0.1421 | 14 |
| truncated | sku | 1 | 165.4765 | 1.143e-31 | 204 |
| truncated | sku | 3 | 359.6615 | 7.838e-73 | 196 |
| expanding | category | 1 | 12.3169 | 0.1376 | 14 |
| expanding | category | 3 | 9.8667 | 0.2745 | 14 |
| expanding | sku | 1 | 239.5551 | 2.813e-47 | 204 |
| expanding | sku | 3 | 198.4266 | 1.371e-38 | 197 |
