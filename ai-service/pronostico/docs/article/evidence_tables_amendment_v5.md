# Evidence tables for the article

Generated 2026-10-27T03:45:17+00:00 by `pcs article-tables` from the audit reports, manifests, run records and statistics tables. Channel: total demand. Results describe the final test.

## Table A1. Vecinos sales record: rows, deterministic exclusions and reconciliation

| step | count |
|---|---|
| Daily sheets read | 568 |
| Rows read | 5989 |
| Excluded by rule R201 | 882 |
| Excluded by rule R202 | 16 |
| Excluded by rule R203 | 4 |
| Excluded by rule R209 | 6 |
| Valid lines | 5081 |
| Valid units | 5563 |
| Valid lines without amount | 283 |
| Daily blocks: match | 562 |
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
| SKUs in the catalog | 2066 |
| SKUs in the panel | 442 |
| Panel share of development units | 0.8000 |
| Structural break | 2025-05-01 |
| Receipt lines possibly also in the vecinos record | 638 |

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

| frequency | record | sealed test | minimum training | window | contrasts | horizons | sensitivity horizons | origins | first origin | last origin | test span used | test window | test origins | first test target | last test target |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| weekly | 2024-01-03 to 2026-08-31 | 2026-03-01 to 2026-08-31 | 52 | rolling, 52 | none | [1, 4] | none | 60 | 2024-12-23 | 2026-02-09 | yes | 2026-03-01 to 2026-08-31 | 29 | 2026-03-02 | 2026-08-24 |
| monthly | 2024-01-03 to 2026-08-31 | 2026-03-01 to 2026-08-31 | 18 | rolling, 18 | none | [1] | [3] | 8 | 2025-06-01 | 2026-01-01 | yes | 2026-03-01 to 2026-08-31 | 8 | 2026-03-01 | 2026-08-01 |

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
| Peak memory of the run (MB) | 1418.2 (main process), 2156.7 (Chronos worker) |
| chronos_zero_shot weights | amazon/chronos-bolt-small@772f3d25d38aec6d914c8949dab4462e2d46f5d8 |
| chronos_fine_tuned weights | amazon/chronos-bolt-small@772f3d25d38aec6d914c8949dab4462e2d46f5d8 |

## Table C2. Configuration files (SHA-256 prefix)

| file | sha256 |
|---|---|
| protocol.yaml | 337c042d1f1860d5 |
| inventory.yaml | 717888fa2d37f028 |
| models.yaml | b264a65618ad107e |
| data_rules.yaml | d081f1e597acb881 |
| sheet_date_overrides.yaml | c91467f8dc76e3c3 |
| catalog.yaml | a876d6d48f7b01b2 |
| series.yaml | c8124a225ebebe5e |
| price_links.yaml | 5ca40385cd340426 |
| stats.yaml | ec80ee6e8e58e8e2 |
| tuning.yaml | ddb7483c66f557a6 |
| tuned.yaml | 397a87a8b8084667 |

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

## Table D1 (Weekly). MASE by horizon, level and model (final test)

| horizon | level | model | mean MASE | median MASE | series |
|---|---|---|---|---|---|
| 1 | category | chronos_fine_tuned | 0.6469 | 0.6586 | 14 |
| 1 | category | chronos_zero_shot | 0.6967 | 0.7018 | 14 |
| 1 | category | croston | 0.8002 | 0.7585 | 14 |
| 1 | category | global_gbm | 0.8389 | 0.8290 | 14 |
| 1 | category | naive | 0.9471 | 0.9139 | 14 |
| 1 | category | sba | 0.7399 | 0.7302 | 14 |
| 1 | category | ses | 0.8128 | 0.8027 | 14 |
| 1 | category | tsb | 0.7744 | 0.7663 | 14 |
| 1 | category | two_stage_trees | 0.8455 | 0.8420 | 14 |
| 1 | sku | chronos_fine_tuned | 0.1777 | 0.0153 | 279 |
| 1 | sku | chronos_zero_shot | 0.2325 | 0.0199 | 279 |
| 1 | sku | croston | 4.7762 | 1.6361 | 279 |
| 1 | sku | global_gbm | 0.3048 | 0.0551 | 279 |
| 1 | sku | naive | 0.3250 | 0 | 279 |
| 1 | sku | sba | 3.9962 | 1.4538 | 279 |
| 1 | sku | ses | 0.4064 | 0.2045 | 279 |
| 1 | sku | tsb | 0.3243 | 0.0019 | 279 |
| 1 | sku | two_stage_trees | 1.8868 | 0.5311 | 279 |
| 1 | total | chronos_fine_tuned | 0.8141 | 0.8141 | 1 |
| 1 | total | chronos_zero_shot | 0.8579 | 0.8579 | 1 |
| 1 | total | croston | 0.9402 | 0.9402 | 1 |
| 1 | total | global_gbm | 1.1793 | 1.1793 | 1 |
| 1 | total | naive | 1.2470 | 1.2470 | 1 |
| 1 | total | sba | 0.8406 | 0.8406 | 1 |
| 1 | total | ses | 0.9964 | 0.9964 | 1 |
| 1 | total | tsb | 0.8946 | 0.8946 | 1 |
| 1 | total | two_stage_trees | 1.1659 | 1.1659 | 1 |
| 4 | category | chronos_fine_tuned | 0.6449 | 0.6413 | 14 |
| 4 | category | chronos_zero_shot | 0.7041 | 0.6753 | 14 |
| 4 | category | croston | 0.8088 | 0.7280 | 14 |
| 4 | category | global_gbm | 0.8934 | 0.8358 | 14 |
| 4 | category | naive | 0.8980 | 0.9229 | 14 |
| 4 | category | sba | 0.7362 | 0.6787 | 14 |
| 4 | category | ses | 0.7872 | 0.7285 | 14 |
| 4 | category | tsb | 0.7619 | 0.6969 | 14 |
| 4 | category | two_stage_trees | 0.9178 | 0.8663 | 14 |
| 4 | sku | chronos_fine_tuned | 0.1933 | 0.0139 | 288 |
| 4 | sku | chronos_zero_shot | 0.2594 | 0.0261 | 288 |
| 4 | sku | croston | 4.1489 | 1.5011 | 288 |
| 4 | sku | global_gbm | 0.3341 | 0.0861 | 288 |
| 4 | sku | naive | 0.3770 | 0 | 288 |
| 4 | sku | sba | 3.5213 | 1.3426 | 288 |
| 4 | sku | ses | 0.4512 | 0.2260 | 288 |
| 4 | sku | tsb | 0.3781 | 0.0035 | 288 |
| 4 | sku | two_stage_trees | 1.8109 | 0.4523 | 288 |
| 4 | total | chronos_fine_tuned | 0.8986 | 0.8986 | 1 |
| 4 | total | chronos_zero_shot | 0.9690 | 0.9690 | 1 |
| 4 | total | croston | 1.0022 | 1.0022 | 1 |
| 4 | total | global_gbm | 1.3841 | 1.3841 | 1 |
| 4 | total | naive | 1.0438 | 1.0438 | 1 |
| 4 | total | sba | 0.8481 | 0.8481 | 1 |
| 4 | total | ses | 1.0476 | 1.0476 | 1 |
| 4 | total | tsb | 0.9674 | 0.9674 | 1 |
| 4 | total | two_stage_trees | 1.3718 | 1.3718 | 1 |

## Table D2 (Weekly). Friedman test and Nemenyi critical difference

| level | horizon | statistic | p_value | series | models | mean_ranks | critical_difference |
|---|---|---|---|---|---|---|---|
| category | 1 | 77.8286 | 1.336e-13 | 14 | 9 | {"chronos_fine_tuned": 1.1428571428571428, "chronos_zero_shot": 2.5714285714285716, "sba": 3.2857142857142856, "tsb": 4.642857142857143, "croston": 5.642857142857143, "ses": 6.214285714285714, "two_stage_trees": 6.571428571428571, "global_gbm": 6.642857142857143, "naive": 8.285714285714286} | 3.2106 |
| category | 4 | 67.7714 | 1.363e-11 | 14 | 9 | {"chronos_fine_tuned": 1.2857142857142858, "sba": 3.2857142857142856, "chronos_zero_shot": 3.5, "tsb": 4.071428571428571, "ses": 5.071428571428571, "croston": 6.0, "global_gbm": 7.0, "two_stage_trees": 7.357142857142857, "naive": 7.428571428571429} | 3.2106 |
| sku | 1 | 1424.0452 | 3.578e-302 | 279 | 9 | {"naive": 2.2132616487455197, "chronos_fine_tuned": 3.0089605734767026, "tsb": 3.4623655913978495, "chronos_zero_shot": 3.7455197132616487, "global_gbm": 4.240143369175628, "ses": 5.827956989247312, "two_stage_trees": 6.272401433691757, "sba": 7.720430107526882, "croston": 8.508960573476703} | 0.7192 |
| sku | 4 | 1437.1484 | 5.251e-305 | 288 | 9 | {"naive": 2.314236111111111, "chronos_fine_tuned": 2.78125, "tsb": 3.560763888888889, "chronos_zero_shot": 3.920138888888889, "global_gbm": 4.204861111111111, "ses": 5.888888888888889, "two_stage_trees": 6.163194444444445, "sba": 7.729166666666667, "croston": 8.4375} | 0.7079 |

## Table D3 (Weekly). Diebold-Mariano tests per series (Holm-adjusted)

| horizon | model_a | model_b | series_tested | a_better | b_better | median_statistic |
|---|---|---|---|---|---|---|
| 1 | ses | naive | 294 | 0 | 77 | 2.0385 |
| 1 | croston | naive | 294 | 0 | 72 | 2.0709 |
| 1 | sba | naive | 294 | 0 | 90 | 2.1047 |
| 1 | tsb | naive | 294 | 0 | 0 | 1.7733 |
| 1 | two_stage_trees | naive | 457 | 0 | 54 | 2.3953 |
| 1 | global_gbm | naive | 457 | 0 | 1 | 1.9380 |
| 1 | chronos_zero_shot | naive | 294 | 0 | 46 | 1.9102 |
| 1 | chronos_fine_tuned | naive | 279 | 0 | 46 | 2.1258 |
| 1 | sba | croston | 294 | 40 | 9 | -1.8834 |
| 1 | tsb | croston | 294 | 59 | 0 | -2.1191 |
| 1 | global_gbm | two_stage_trees | 457 | 17 | 0 | -2.3953 |
| 1 | chronos_fine_tuned | chronos_zero_shot | 294 | 11 | 2 | -0.8513 |
| 4 | ses | naive | 302 | 0 | 0 | 1.0369 |
| 4 | croston | naive | 302 | 0 | 17 | 1.1850 |
| 4 | sba | naive | 301 | 0 | 35 | 1.1921 |
| 4 | tsb | naive | 302 | 1 | 0 | 0.9649 |
| 4 | two_stage_trees | naive | 457 | 0 | 7 | 1.0759 |
| 4 | global_gbm | naive | 456 | 0 | 0 | 1.1419 |
| 4 | chronos_zero_shot | naive | 303 | 0 | 31 | 1.0279 |
| 4 | chronos_fine_tuned | naive | 293 | 0 | 5 | 1.1225 |
| 4 | sba | croston | 300 | 13 | 7 | -1.1861 |
| 4 | tsb | croston | 298 | 16 | 0 | -1.2303 |
| 4 | global_gbm | two_stage_trees | 455 | 8 | 0 | -1.0759 |
| 4 | chronos_fine_tuned | chronos_zero_shot | 302 | 18 | 0 | -1.1184 |

## Table D4 (Weekly). Inventory simulation, primary scenario

| level | model | fill_rate | mean_on_hand | mean_safety_stock | lost_units | lost_value | target_reached |
|---|---|---|---|---|---|---|---|
| category | chronos_fine_tuned | 0.9032 | 9.0495 | 8.4399 | 97 | 124665.4384 | 0.8571 |
| category | chronos_zero_shot | 0.9148 | 9.1868 | 7.8058 | 91 | 114709.0126 | 0.8571 |
| category | croston | 0.9152 | 9.4863 | 7.1574 | 91 | 112497.2796 | 0.8571 |
| category | global_gbm | 0.9051 | 9.0330 | 5.9713 | 102 | 125291.4164 | 0.8571 |
| category | naive | 0.9317 | 18.1071 | 5.6804 | 72 | 96235.9988 | 1 |
| category | sba | 0.9204 | 10.0137 | 8.5563 | 86 | 109213.7335 | 0.8571 |
| category | ses | 0.9246 | 9.7005 | 7.1574 | 84 | 107373.2184 | 0.8571 |
| category | tsb | 0.9243 | 9.9835 | 7.4079 | 84 | 103958.6938 | 0.9286 |
| category | two_stage_trees | 0.8990 | 9.0192 | 5.6015 | 107 | 130178.9186 | 0.8571 |
| sku | chronos_fine_tuned | 0.9870 | 2.1139 | 0.9588 | 29 | 8130.9903 | 0.6403 |
| sku | chronos_zero_shot | 0.9882 | 2.0774 | 0.8816 | 27 | 7494.9829 | 0.7421 |
| sku | croston | 0.9874 | 2.5096 | 0.9014 | 25 | 5885.9960 | 0.6493 |
| sku | global_gbm | 0.9891 | 2.0983 | 0.8619 | 25 | 6100.9840 | 0.7127 |
| sku | naive | 0.9796 | 1.8706 | 0.7563 | 30 | 6528.9716 | 0.6878 |
| sku | sba | 0.9874 | 2.3296 | 0.9146 | 25 | 5885.9960 | 0.6448 |
| sku | ses | 0.9865 | 1.7881 | 0.8910 | 26 | 5445.9799 | 0.6606 |
| sku | tsb | 0.9853 | 1.7537 | 0.8474 | 27 | 6559.9805 | 0.6719 |
| sku | two_stage_trees | 0.9848 | 1.8301 | 0.5990 | 30 | 9705.9969 | 0.8507 |
| total | chronos_fine_tuned | 0.8541 | 37.6538 | 26.0241 | 110 | 85772.8404 | 1 |
| total | chronos_zero_shot | 0.8223 | 33 | 13.0121 | 134 | 107081.9714 | 1 |
| total | croston | 0.8408 | 37.0385 | 13.0121 | 120 | 94921.5842 | 1 |
| total | global_gbm | 0.8846 | 41.5385 | 0 | 87 | 59781.5474 | 1 |
| total | naive | 0.9602 | 92.5769 | 39.0362 | 30 | 23130.3995 | 1 |
| total | sba | 0.8926 | 47 | 39.0362 | 81 | 56299.1512 | 1 |
| total | ses | 0.9072 | 50.5385 | 26.0241 | 70 | 40668.0767 | 1 |
| total | tsb | 0.8859 | 45.3846 | 26.0241 | 86 | 53242.0739 | 1 |
| total | two_stage_trees | 0.8740 | 40.9231 | 0 | 95 | 74527.6702 | 1 |

## Table D5 (Weekly). Spearman between the MASE and fill-rate rankings

| level | rho | ci_low | ci_high | resamples | models | below_threshold |
|---|---|---|---|---|---|---|
| category | -0.2667 | -0.5525 | 0.1500 | 1000 | 9 | yes |
| sku | -0.3431 | -0.7783 | 0.5611 | 1000 | 9 | no |
| total | -0.4333 | -0.4333 | -0.4333 | 1000 | 9 | yes |

## Table D6 (Weekly). HE3 robustness: break, truncated history, expanding window

| condition | level | horizon | statistic | p_value | series |
|---|---|---|---|---|---|
| truncated | category | 1 | 40.9714 | 2.11e-06 | 14 |
| truncated | category | 4 | 27.9810 | 0.0005 | 14 |
| truncated | sku | 1 | 222.8183 | 9.772e-44 | 79 |
| truncated | sku | 4 | 272.6487 | 2.693e-54 | 94 |
| expanding | category | 1 | 55.7905 | 3.099e-09 | 14 |
| expanding | category | 4 | 37.6000 | 8.923e-06 | 14 |
| expanding | sku | 1 | 178.2901 | 2.353e-34 | 79 |
| expanding | sku | 4 | 226.7209 | 1.462e-44 | 96 |

## Table D1 (Monthly). MASE by horizon, level and model (final test)

| horizon | level | model | mean MASE | median MASE | series |
|---|---|---|---|---|---|
| 1 | category | chronos_fine_tuned | 0.5840 | 0.5466 | 14 |
| 1 | category | chronos_zero_shot | 0.6668 | 0.6621 | 14 |
| 1 | category | croston | 0.8050 | 0.8840 | 14 |
| 1 | category | global_gbm | 1.0048 | 1.0225 | 14 |
| 1 | category | naive | 0.6832 | 0.6781 | 14 |
| 1 | category | sba | 0.6253 | 0.6210 | 14 |
| 1 | category | ses | 0.7242 | 0.7547 | 14 |
| 1 | category | tsb | 0.7172 | 0.7782 | 14 |
| 1 | category | two_stage_trees | 1.1364 | 1.0895 | 14 |
| 1 | sku | chronos_fine_tuned | 0.1428 | 0.0303 | 356 |
| 1 | sku | chronos_zero_shot | 0.2051 | 0.0502 | 356 |
| 1 | sku | croston | 3.0849 | 1.4571 | 356 |
| 1 | sku | global_gbm | 0.2055 | 0.0118 | 356 |
| 1 | sku | naive | 0.2269 | 0 | 356 |
| 1 | sku | sba | 2.6271 | 1.2627 | 356 |
| 1 | sku | ses | 0.3674 | 0.2247 | 356 |
| 1 | sku | tsb | 0.3591 | 0.1307 | 356 |
| 1 | sku | two_stage_trees | 0.5842 | 0.3296 | 356 |
| 1 | total | chronos_fine_tuned | 0.6993 | 0.6993 | 1 |
| 1 | total | chronos_zero_shot | 0.7646 | 0.7646 | 1 |
| 1 | total | croston | 0.9239 | 0.9239 | 1 |
| 1 | total | global_gbm | 1.3025 | 1.3025 | 1 |
| 1 | total | naive | 0.6828 | 0.6828 | 1 |
| 1 | total | sba | 0.7482 | 0.7482 | 1 |
| 1 | total | ses | 0.6773 | 0.6773 | 1 |
| 1 | total | tsb | 0.7714 | 0.7714 | 1 |
| 1 | total | two_stage_trees | 1.2310 | 1.2310 | 1 |
| 3 | category | chronos_fine_tuned | 0.6613 | 0.7005 | 14 |
| 3 | category | chronos_zero_shot | 0.9652 | 1.0023 | 14 |
| 3 | category | croston | 0.9125 | 0.9229 | 14 |
| 3 | category | global_gbm | 1.5371 | 1.5855 | 14 |
| 3 | category | naive | 0.8300 | 0.7939 | 14 |
| 3 | category | sba | 0.6828 | 0.6886 | 14 |
| 3 | category | ses | 0.7968 | 0.8268 | 14 |
| 3 | category | tsb | 0.8043 | 0.8043 | 14 |
| 3 | category | two_stage_trees | 1.6357 | 1.4887 | 14 |
| 3 | sku | chronos_fine_tuned | 0.1599 | 0.0367 | 384 |
| 3 | sku | chronos_zero_shot | 0.3051 | 0.1263 | 384 |
| 3 | sku | croston | 2.9021 | 1.2470 | 384 |
| 3 | sku | global_gbm | 0.2460 | 0.0293 | 384 |
| 3 | sku | naive | 0.3742 | 0 | 384 |
| 3 | sku | sba | 2.4865 | 1.1123 | 384 |
| 3 | sku | ses | 0.4902 | 0.2560 | 384 |
| 3 | sku | tsb | 0.4744 | 0.1864 | 384 |
| 3 | sku | two_stage_trees | 1.2701 | 0.4743 | 384 |
| 3 | total | chronos_fine_tuned | 0.9157 | 0.9157 | 1 |
| 3 | total | chronos_zero_shot | 1.4055 | 1.4055 | 1 |
| 3 | total | croston | 1.0827 | 1.0827 | 1 |
| 3 | total | global_gbm | 2.2613 | 2.2613 | 1 |
| 3 | total | naive | 0.8755 | 0.8755 | 1 |
| 3 | total | sba | 0.7921 | 0.7921 | 1 |
| 3 | total | ses | 0.8294 | 0.8294 | 1 |
| 3 | total | tsb | 0.9303 | 0.9303 | 1 |
| 3 | total | two_stage_trees | 2.0650 | 2.0650 | 1 |

## Table D2 (Monthly). Friedman test and Nemenyi critical difference

| level | horizon | statistic | p_value | series | models | mean_ranks | critical_difference |
|---|---|---|---|---|---|---|---|
| category | 1 | 45.6381 | 2.785e-07 | 14 | 9 | {"chronos_fine_tuned": 2.7857142857142856, "sba": 2.857142857142857, "chronos_zero_shot": 4.357142857142857, "naive": 4.428571428571429, "tsb": 4.571428571428571, "ses": 5.142857142857143, "croston": 5.642857142857143, "global_gbm": 7.571428571428571, "two_stage_trees": 7.642857142857143} | 3.2106 |
| category | 3 | 58.6857 | 8.434e-10 | 14 | 9 | {"chronos_fine_tuned": 2.5, "sba": 2.5, "ses": 4.285714285714286, "tsb": 4.357142857142857, "naive": 4.714285714285714, "chronos_zero_shot": 4.928571428571429, "croston": 5.857142857142857, "two_stage_trees": 7.785714285714286, "global_gbm": 8.071428571428571} | 3.2106 |
| sku | 1 | 1683.8430 | 0 | 356 | 9 | {"naive": 2.0842696629213484, "chronos_fine_tuned": 3.1264044943820224, "global_gbm": 3.247191011235955, "chronos_zero_shot": 3.8230337078651684, "tsb": 5.317415730337078, "ses": 5.429775280898877, "two_stage_trees": 6.134831460674158, "sba": 7.48314606741573, "croston": 8.353932584269662} | 0.6367 |
| sku | 3 | 1513.7668 | 0 | 384 | 9 | {"naive": 2.64453125, "chronos_fine_tuned": 2.8971354166666665, "global_gbm": 3.3880208333333335, "chronos_zero_shot": 4.106770833333333, "ses": 5.231770833333333, "tsb": 5.338541666666667, "two_stage_trees": 5.955729166666667, "sba": 7.315104166666667, "croston": 8.122395833333334} | 0.6130 |

## Table D3 (Monthly). Diebold-Mariano tests per series (Holm-adjusted)

| horizon | model_a | model_b | series_tested | a_better | b_better | median_statistic |
|---|---|---|---|---|---|---|
| 1 | ses | naive | 371 | 0 | 33 | 1.3208 |
| 1 | croston | naive | 371 | 0 | 8 | 2.4004 |
| 1 | sba | naive | 371 | 0 | 23 | 2.5131 |
| 1 | tsb | naive | 371 | 0 | 0 | 2.0254 |
| 1 | two_stage_trees | naive | 457 | 0 | 1 | 1.5798 |
| 1 | global_gbm | naive | 457 | 0 | 0 | 1.2212 |
| 1 | chronos_zero_shot | naive | 360 | 0 | 0 | 1.1747 |
| 1 | chronos_fine_tuned | naive | 364 | 0 | 0 | 1.1653 |
| 1 | sba | croston | 371 | 1 | 16 | -1.7445 |
| 1 | tsb | croston | 371 | 6 | 0 | -2.1562 |
| 1 | global_gbm | two_stage_trees | 457 | 1 | 0 | -1.5955 |
| 1 | chronos_fine_tuned | chronos_zero_shot | 370 | 0 | 0 | -1.0000 |
| 3 | ses | naive | 355 | 3 | 4 | 0.8142 |
| 3 | croston | naive | 343 | 0 | 5 | 1.4241 |
| 3 | sba | naive | 349 | 0 | 21 | 1.4748 |
| 3 | tsb | naive | 364 | 1 | 0 | 0.9905 |
| 3 | two_stage_trees | naive | 418 | 2 | 5 | 0.9422 |
| 3 | global_gbm | naive | 415 | 3 | 11 | 0.8665 |
| 3 | chronos_zero_shot | naive | 351 | 5 | 9 | 0.9023 |
| 3 | chronos_fine_tuned | naive | 348 | 4 | 4 | 0.7519 |
| 3 | sba | croston | 364 | 3 | 4 | -1.0880 |
| 3 | tsb | croston | 355 | 6 | 0 | -1.2080 |
| 3 | global_gbm | two_stage_trees | 418 | 5 | 0 | -1.0849 |
| 3 | chronos_fine_tuned | chronos_zero_shot | 349 | 4 | 1 | -0.7680 |

## Table D4 (Monthly). Inventory simulation, primary scenario

| level | model | fill_rate | mean_on_hand | mean_safety_stock | lost_units | lost_value | target_reached |
|---|---|---|---|---|---|---|---|
| category | chronos_fine_tuned | 0.9403 | 19.1786 | 13.0795 | 74 | 58067.0426 | 1 |
| category | chronos_zero_shot | 0.9375 | 21.0238 | 9.1934 | 74 | 50571.8475 | 1 |
| category | croston | 0.9588 | 17.9286 | 3.0598 | 58 | 38585.2057 | 1 |
| category | global_gbm | 0.9730 | 30.5357 | 3.2146 | 45 | 30949.2148 | 1 |
| category | naive | 0.9288 | 27.0714 | 12.4670 | 58 | 33231.0224 | 1 |
| category | sba | 0.9230 | 15.8095 | 7.3006 | 83 | 62205.6391 | 1 |
| category | ses | 0.9228 | 17.8810 | 5.9703 | 90 | 63407.5775 | 1 |
| category | tsb | 0.9456 | 16.4405 | 4.2557 | 71 | 51332.1230 | 1 |
| category | two_stage_trees | 0.9730 | 34.8333 | 3.0575 | 45 | 30949.2148 | 1 |
| sku | chronos_fine_tuned | 0.9899 | 1.8680 | 1.3056 | 25 | 5184.9672 | 0.8688 |
| sku | chronos_zero_shot | 0.9879 | 2.0943 | 1.1483 | 27 | 5179.9612 | 0.8824 |
| sku | croston | 0.9935 | 3.8356 | 1.0747 | 20 | 3359.9922 | 0.8733 |
| sku | global_gbm | 0.9924 | 2.3051 | 1.2166 | 21 | 3554.9922 | 0.8733 |
| sku | naive | 0.9616 | 1.7862 | 1.0214 | 40 | 7989.9902 | 0.8824 |
| sku | sba | 0.9904 | 3.4287 | 1.0930 | 28 | 5999.9744 | 0.8733 |
| sku | ses | 0.9913 | 2.0008 | 0.9432 | 23 | 5885.0056 | 0.8801 |
| sku | tsb | 0.9899 | 1.9970 | 0.9219 | 27 | 5392.4706 | 0.8824 |
| sku | two_stage_trees | 0.9845 | 2.4668 | 0.8215 | 32 | 9975.8246 | 0.9548 |
| total | chronos_fine_tuned | 0.9205 | 155.3333 | 35.1809 | 60 | 42520.7942 | 1 |
| total | chronos_zero_shot | 0.9629 | 233.6667 | 35.1809 | 28 | 19843.0373 | 1 |
| total | croston | 0.9974 | 179.6667 | 0 | 2 | 1417.3598 | 1 |
| total | global_gbm | 1 | 382.8333 | 0 | 0 | 0 | 1 |
| total | naive | 0.9642 | 215 | 70.3618 | 27 | 19134.3574 | 1 |
| total | sba | 0.8517 | 116.5000 | 0 | 112 | 79372.1491 | 1 |
| total | ses | 0.8834 | 147.3333 | 0 | 88 | 62363.8314 | 1 |
| total | tsb | 0.9272 | 154.3333 | 0 | 55 | 38977.3946 | 1 |
| total | two_stage_trees | 1 | 315.8333 | 0 | 0 | 0 | 1 |

## Table D5 (Monthly). Spearman between the MASE and fill-rate rankings

| level | rho | ci_low | ci_high | resamples | models | below_threshold |
|---|---|---|---|---|---|---|
| category | -0.6276 | -0.8954 | -0.2760 | 1000 | 9 | yes |
| sku | -0.4500 | -0.6500 | -0.0667 | 1000 | 9 | yes |
| total | -0.7448 | -0.7448 | -0.7448 | 1000 | 9 | yes |

## Table D6 (Monthly). HE3 robustness: break, truncated history, expanding window

| condition | level | horizon | statistic | p_value | series |
|---|---|---|---|---|---|
| truncated | category | 1 | 13.6381 | 0.0917 | 14 |
| truncated | category | 3 | 50.2857 | 3.601e-08 | 14 |
| truncated | sku | 1 | 98.4609 | 8.805e-18 | 94 |
| truncated | sku | 3 | 384.0168 | 4.903e-78 | 127 |
| expanding | category | 1 | 5.9429 | 0.6536 | 14 |
| expanding | category | 3 | 14.1846 | 0.0771 | 14 |
| expanding | sku | 1 | 144.7750 | 2.407e-27 | 96 |
| expanding | sku | 3 | 231.9037 | 1.171e-45 | 129 |
