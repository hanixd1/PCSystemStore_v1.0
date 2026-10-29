# Evidence tables for the article

Generated 2026-10-26T22:40:40+00:00 by `pcs article-tables` from the audit reports, manifests, run records and statistics tables. Channel: total demand. Results describe the final test.

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

| frequency | record | sealed test | minimum training | window | contrasts | horizons | sensitivity horizons | origins | first origin | last origin | test span used | test window | test origins | first test target | last test target |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| weekly | 2024-01-03 to 2026-09-14 | 2026-03-01 to 2026-08-31 | 52 | rolling, 52 | truncated (rolling, 26); expanding (all history) | [1, 4] | none | 60 | 2024-12-23 | 2026-02-09 | yes | 2026-03-01 to 2026-08-31 | 29 | 2026-03-02 | 2026-08-24 |
| monthly | 2024-01-03 to 2026-09-14 | 2026-03-01 to 2026-08-31 | 18 | rolling, 18 | truncated (rolling, 9); expanding (all history) | [1] | [3] | 8 | 2025-06-01 | 2026-01-01 | yes | 2026-03-01 to 2026-08-31 | 8 | 2026-03-01 | 2026-08-01 |

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
| Peak memory of the run (MB) | 1527.7 (main process), 2226.7 (Chronos worker) |
| chronos_zero_shot weights | amazon/chronos-bolt-small@772f3d25d38aec6d914c8949dab4462e2d46f5d8 |
| chronos_fine_tuned weights | amazon/chronos-bolt-small@772f3d25d38aec6d914c8949dab4462e2d46f5d8 |

## Table C2. Configuration files (SHA-256 prefix)

| file | sha256 |
|---|---|
| protocol.yaml | 57497f5bfa36681e |
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
| 1 | category | chronos_fine_tuned | 0.6537 | 0.6727 | 14 |
| 1 | category | chronos_zero_shot | 0.7128 | 0.7404 | 14 |
| 1 | category | croston | 0.8266 | 0.8710 | 14 |
| 1 | category | global_gbm | 0.8568 | 0.8736 | 14 |
| 1 | category | naive | 0.9776 | 0.9334 | 14 |
| 1 | category | sba | 0.7555 | 0.7729 | 14 |
| 1 | category | ses | 0.8307 | 0.8607 | 14 |
| 1 | category | tsb | 0.7895 | 0.8125 | 14 |
| 1 | category | two_stage_trees | 0.8767 | 0.8651 | 14 |
| 1 | sku | chronos_fine_tuned | 0.1776 | 0.0156 | 279 |
| 1 | sku | chronos_zero_shot | 0.2319 | 0.0199 | 279 |
| 1 | sku | croston | 4.7740 | 1.5960 | 279 |
| 1 | sku | global_gbm | 0.3045 | 0.0563 | 279 |
| 1 | sku | naive | 0.3251 | 0 | 279 |
| 1 | sku | sba | 3.9945 | 1.4538 | 279 |
| 1 | sku | ses | 0.4049 | 0.2045 | 279 |
| 1 | sku | tsb | 0.3232 | 0.0019 | 279 |
| 1 | sku | two_stage_trees | 1.8622 | 0.5250 | 279 |
| 1 | total | chronos_fine_tuned | 0.8507 | 0.8507 | 1 |
| 1 | total | chronos_zero_shot | 0.8985 | 0.8985 | 1 |
| 1 | total | croston | 0.9540 | 0.9540 | 1 |
| 1 | total | global_gbm | 1.1651 | 1.1651 | 1 |
| 1 | total | naive | 1.3103 | 1.3103 | 1 |
| 1 | total | sba | 0.8780 | 0.8780 | 1 |
| 1 | total | ses | 1.0053 | 1.0053 | 1 |
| 1 | total | tsb | 0.9221 | 0.9221 | 1 |
| 1 | total | two_stage_trees | 1.1766 | 1.1766 | 1 |
| 4 | category | chronos_fine_tuned | 0.6603 | 0.6783 | 14 |
| 4 | category | chronos_zero_shot | 0.7197 | 0.7318 | 14 |
| 4 | category | croston | 0.8387 | 0.8523 | 14 |
| 4 | category | global_gbm | 0.9075 | 0.8869 | 14 |
| 4 | category | naive | 0.8849 | 0.8863 | 14 |
| 4 | category | sba | 0.7598 | 0.7571 | 14 |
| 4 | category | ses | 0.8181 | 0.8213 | 14 |
| 4 | category | tsb | 0.7853 | 0.8009 | 14 |
| 4 | category | two_stage_trees | 0.9396 | 0.9058 | 14 |
| 4 | sku | chronos_fine_tuned | 0.1928 | 0.0139 | 288 |
| 4 | sku | chronos_zero_shot | 0.2589 | 0.0261 | 288 |
| 4 | sku | croston | 4.1467 | 1.5011 | 288 |
| 4 | sku | global_gbm | 0.3334 | 0.0828 | 288 |
| 4 | sku | naive | 0.3745 | 0 | 288 |
| 4 | sku | sba | 3.5196 | 1.3426 | 288 |
| 4 | sku | ses | 0.4498 | 0.2260 | 288 |
| 4 | sku | tsb | 0.3766 | 0.0035 | 288 |
| 4 | sku | two_stage_trees | 1.7984 | 0.4604 | 288 |
| 4 | total | chronos_fine_tuned | 0.9311 | 0.9311 | 1 |
| 4 | total | chronos_zero_shot | 0.9905 | 0.9905 | 1 |
| 4 | total | croston | 1.0140 | 1.0140 | 1 |
| 4 | total | global_gbm | 1.3678 | 1.3678 | 1 |
| 4 | total | naive | 1.0470 | 1.0470 | 1 |
| 4 | total | sba | 0.8757 | 0.8757 | 1 |
| 4 | total | ses | 1.0740 | 1.0740 | 1 |
| 4 | total | tsb | 0.9830 | 0.9830 | 1 |
| 4 | total | two_stage_trees | 1.3716 | 1.3716 | 1 |

## Table D2 (Weekly). Friedman test and Nemenyi critical difference

| level | horizon | statistic | p_value | series | models | mean_ranks | critical_difference |
|---|---|---|---|---|---|---|---|
| category | 1 | 76.2857 | 2.725e-13 | 14 | 9 | {"chronos_fine_tuned": 1.0714285714285714, "chronos_zero_shot": 2.857142857142857, "sba": 3.2142857142857144, "tsb": 4.571428571428571, "croston": 5.928571428571429, "ses": 5.928571428571429, "global_gbm": 6.5, "two_stage_trees": 6.642857142857143, "naive": 8.285714285714286} | 3.2106 |
| category | 4 | 68.8190 | 8.441e-12 | 14 | 9 | {"chronos_fine_tuned": 1.2857142857142858, "sba": 3.0714285714285716, "chronos_zero_shot": 3.4285714285714284, "tsb": 3.9285714285714284, "ses": 5.642857142857143, "croston": 6.357142857142857, "naive": 6.714285714285714, "global_gbm": 7.071428571428571, "two_stage_trees": 7.5} | 3.2106 |
| sku | 1 | 1420.5808 | 2.008e-301 | 279 | 9 | {"naive": 2.2347670250896057, "chronos_fine_tuned": 3.0089605734767026, "tsb": 3.4623655913978495, "chronos_zero_shot": 3.7455197132616487, "global_gbm": 4.21505376344086, "ses": 5.827956989247312, "two_stage_trees": 6.279569892473118, "sba": 7.724014336917563, "croston": 8.501792114695341} | 0.7192 |
| sku | 4 | 1455.2588 | 6.367e-309 | 288 | 9 | {"naive": 2.282986111111111, "chronos_fine_tuned": 2.7881944444444446, "tsb": 3.529513888888889, "chronos_zero_shot": 3.920138888888889, "global_gbm": 4.215277777777778, "ses": 5.881944444444445, "two_stage_trees": 6.177083333333333, "sba": 7.746527777777778, "croston": 8.458333333333334} | 0.7079 |

## Table D3 (Weekly). Diebold-Mariano tests per series (Holm-adjusted)

| horizon | model_a | model_b | series_tested | a_better | b_better | median_statistic |
|---|---|---|---|---|---|---|
| 1 | ses | naive | 294 | 0 | 77 | 2.0385 |
| 1 | croston | naive | 294 | 0 | 72 | 2.0709 |
| 1 | sba | naive | 294 | 0 | 90 | 2.1047 |
| 1 | tsb | naive | 294 | 0 | 0 | 1.7733 |
| 1 | two_stage_trees | naive | 457 | 0 | 54 | 2.3859 |
| 1 | global_gbm | naive | 457 | 0 | 1 | 1.9086 |
| 1 | chronos_zero_shot | naive | 294 | 0 | 46 | 1.9102 |
| 1 | chronos_fine_tuned | naive | 279 | 0 | 50 | 2.1258 |
| 1 | sba | croston | 294 | 41 | 9 | -1.8834 |
| 1 | tsb | croston | 294 | 59 | 0 | -2.1191 |
| 1 | global_gbm | two_stage_trees | 457 | 17 | 0 | -2.3859 |
| 1 | chronos_fine_tuned | chronos_zero_shot | 294 | 9 | 2 | -0.9473 |
| 4 | ses | naive | 303 | 0 | 0 | 1.0344 |
| 4 | croston | naive | 302 | 0 | 17 | 1.1850 |
| 4 | sba | naive | 301 | 0 | 35 | 1.1921 |
| 4 | tsb | naive | 302 | 0 | 0 | 0.9649 |
| 4 | two_stage_trees | naive | 457 | 0 | 7 | 1.0795 |
| 4 | global_gbm | naive | 456 | 0 | 0 | 1.1349 |
| 4 | chronos_zero_shot | naive | 303 | 0 | 31 | 1.0279 |
| 4 | chronos_fine_tuned | naive | 293 | 0 | 5 | 1.1225 |
| 4 | sba | croston | 300 | 13 | 7 | -1.1861 |
| 4 | tsb | croston | 298 | 16 | 0 | -1.2417 |
| 4 | global_gbm | two_stage_trees | 455 | 9 | 0 | -1.0795 |
| 4 | chronos_fine_tuned | chronos_zero_shot | 302 | 18 | 0 | -1.1068 |

## Table D4 (Weekly). Inventory simulation, primary scenario

| level | model | fill_rate | mean_on_hand | mean_safety_stock | lost_units | lost_value | target_reached |
|---|---|---|---|---|---|---|---|
| category | chronos_fine_tuned | 0.8997 | 9.1593 | 8.5818 | 100 | 126157.0107 | 0.8571 |
| category | chronos_zero_shot | 0.9113 | 9.3132 | 7.9404 | 94 | 115829.2408 | 0.8571 |
| category | croston | 0.9152 | 9.6346 | 7.2665 | 91 | 112805.1228 | 0.8571 |
| category | global_gbm | 0.9056 | 9.2610 | 6.0903 | 102 | 124561.6427 | 0.8571 |
| category | naive | 0.9404 | 18.6456 | 5.7768 | 65 | 91453.3813 | 1 |
| category | sba | 0.9181 | 10.1291 | 8.6979 | 88 | 110138.9654 | 0.8571 |
| category | ses | 0.9236 | 9.8956 | 7.2665 | 85 | 107953.5812 | 0.8571 |
| category | tsb | 0.9232 | 10.0934 | 7.5155 | 85 | 104435.5959 | 0.9286 |
| category | two_stage_trees | 0.8957 | 9.3626 | 5.7112 | 110 | 130260.0861 | 0.8571 |
| sku | chronos_fine_tuned | 0.9870 | 2.1130 | 0.9589 | 29 | 8130.9903 | 0.6403 |
| sku | chronos_zero_shot | 0.9889 | 2.0763 | 0.8817 | 26 | 7274.9829 | 0.7421 |
| sku | croston | 0.9874 | 2.5097 | 0.9015 | 25 | 5885.9960 | 0.6493 |
| sku | global_gbm | 0.9891 | 2.0980 | 0.8621 | 25 | 6100.9840 | 0.7127 |
| sku | naive | 0.9796 | 1.8730 | 0.7565 | 30 | 6528.9716 | 0.6878 |
| sku | sba | 0.9874 | 2.3294 | 0.9148 | 25 | 5885.9960 | 0.6448 |
| sku | ses | 0.9865 | 1.7879 | 0.8911 | 26 | 5445.9799 | 0.6606 |
| sku | tsb | 0.9853 | 1.7537 | 0.8475 | 27 | 6559.9805 | 0.6719 |
| sku | two_stage_trees | 0.9856 | 1.8306 | 0.5989 | 29 | 9485.9969 | 0.8507 |
| total | chronos_fine_tuned | 0.8475 | 37.8846 | 27.0119 | 115 | 97247.2698 | 1 |
| total | chronos_zero_shot | 0.8223 | 33.1923 | 13.5060 | 134 | 116205.5375 | 1 |
| total | croston | 0.8422 | 37.8077 | 13.5060 | 119 | 103574.9776 | 1 |
| total | global_gbm | 0.8820 | 42.0769 | 0 | 89 | 69983.6453 | 1 |
| total | naive | 0.9721 | 95.5385 | 40.5179 | 21 | 18898.8455 | 1 |
| total | sba | 0.8952 | 48.3077 | 40.5179 | 79 | 64482.3720 | 1 |
| total | ses | 0.9085 | 51.9615 | 27.0119 | 69 | 49321.4701 | 1 |
| total | tsb | 0.8886 | 46.6154 | 27.0119 | 84 | 61425.2947 | 1 |
| total | two_stage_trees | 0.8753 | 41.0769 | 0 | 94 | 84010.1826 | 1 |

## Table D5 (Weekly). Spearman between the MASE and fill-rate rankings

| level | rho | ci_low | ci_high | resamples | models | below_threshold |
|---|---|---|---|---|---|---|
| category | -0.2092 | -0.6833 | 0.1257 | 1000 | 9 | yes |
| sku | -0.4100 | -0.8117 | 0.5774 | 1000 | 9 | no |
| total | -0.4167 | -0.4167 | -0.4167 | 1000 | 9 | yes |

## Table D6 (Weekly). HE3 robustness: break, truncated history, expanding window

| condition | level | horizon | statistic | p_value | series |
|---|---|---|---|---|---|
| truncated | category | 1 | 41.0667 | 2.026e-06 | 14 |
| truncated | category | 4 | 40.8000 | 2.272e-06 | 14 |
| truncated | sku | 1 | 214.4739 | 5.658e-42 | 79 |
| truncated | sku | 4 | 265.8524 | 7.472e-53 | 94 |
| expanding | category | 1 | 56.7429 | 2.021e-09 | 14 |
| expanding | category | 4 | 31.2571 | 0.0001 | 14 |
| expanding | sku | 1 | 173.6998 | 2.162e-33 | 79 |
| expanding | sku | 4 | 233.6819 | 4.926e-46 | 96 |

## Table D1 (Monthly). MASE by horizon, level and model (final test)

| horizon | level | model | mean MASE | median MASE | series |
|---|---|---|---|---|---|
| 1 | category | chronos_fine_tuned | 0.5977 | 0.5595 | 14 |
| 1 | category | chronos_zero_shot | 0.6752 | 0.6625 | 14 |
| 1 | category | croston | 0.8192 | 0.8840 | 14 |
| 1 | category | global_gbm | 1.0937 | 1.1036 | 14 |
| 1 | category | naive | 0.7054 | 0.6781 | 14 |
| 1 | category | sba | 0.6405 | 0.6461 | 14 |
| 1 | category | ses | 0.7325 | 0.7378 | 14 |
| 1 | category | tsb | 0.7284 | 0.7764 | 14 |
| 1 | category | two_stage_trees | 1.1718 | 1.0924 | 14 |
| 1 | sku | chronos_fine_tuned | 0.1429 | 0.0303 | 356 |
| 1 | sku | chronos_zero_shot | 0.2053 | 0.0502 | 356 |
| 1 | sku | croston | 3.0844 | 1.4571 | 356 |
| 1 | sku | global_gbm | 0.2077 | 0.0123 | 356 |
| 1 | sku | naive | 0.2244 | 0 | 356 |
| 1 | sku | sba | 2.6271 | 1.2627 | 356 |
| 1 | sku | ses | 0.3673 | 0.2247 | 356 |
| 1 | sku | tsb | 0.3586 | 0.1307 | 356 |
| 1 | sku | two_stage_trees | 0.5840 | 0.3283 | 356 |
| 1 | total | chronos_fine_tuned | 0.6937 | 0.6937 | 1 |
| 1 | total | chronos_zero_shot | 0.7843 | 0.7843 | 1 |
| 1 | total | croston | 0.9271 | 0.9271 | 1 |
| 1 | total | global_gbm | 1.5054 | 1.5054 | 1 |
| 1 | total | naive | 0.6828 | 0.6828 | 1 |
| 1 | total | sba | 0.7540 | 0.7540 | 1 |
| 1 | total | ses | 0.6796 | 0.6796 | 1 |
| 1 | total | tsb | 0.7751 | 0.7751 | 1 |
| 1 | total | two_stage_trees | 1.2789 | 1.2789 | 1 |
| 3 | category | chronos_fine_tuned | 0.6811 | 0.7046 | 14 |
| 3 | category | chronos_zero_shot | 0.9840 | 1.0167 | 14 |
| 3 | category | croston | 0.9232 | 0.9261 | 14 |
| 3 | category | global_gbm | 1.5436 | 1.5773 | 14 |
| 3 | category | naive | 0.8506 | 0.8075 | 14 |
| 3 | category | sba | 0.6945 | 0.6916 | 14 |
| 3 | category | ses | 0.8074 | 0.8325 | 14 |
| 3 | category | tsb | 0.8137 | 0.8121 | 14 |
| 3 | category | two_stage_trees | 1.6436 | 1.4966 | 14 |
| 3 | sku | chronos_fine_tuned | 0.1598 | 0.0367 | 384 |
| 3 | sku | chronos_zero_shot | 0.3049 | 0.1263 | 384 |
| 3 | sku | croston | 2.9018 | 1.2470 | 384 |
| 3 | sku | global_gbm | 0.2462 | 0.0292 | 384 |
| 3 | sku | naive | 0.3749 | 0 | 384 |
| 3 | sku | sba | 2.4861 | 1.1123 | 384 |
| 3 | sku | ses | 0.4897 | 0.2560 | 384 |
| 3 | sku | tsb | 0.4744 | 0.1864 | 384 |
| 3 | sku | two_stage_trees | 1.2691 | 0.4720 | 384 |
| 3 | total | chronos_fine_tuned | 0.9356 | 0.9356 | 1 |
| 3 | total | chronos_zero_shot | 1.4225 | 1.4225 | 1 |
| 3 | total | croston | 1.0887 | 1.0887 | 1 |
| 3 | total | global_gbm | 2.2923 | 2.2923 | 1 |
| 3 | total | naive | 0.8994 | 0.8994 | 1 |
| 3 | total | sba | 0.7989 | 0.7989 | 1 |
| 3 | total | ses | 0.8522 | 0.8522 | 1 |
| 3 | total | tsb | 0.9384 | 0.9384 | 1 |
| 3 | total | two_stage_trees | 2.0806 | 2.0806 | 1 |

## Table D2 (Monthly). Friedman test and Nemenyi critical difference

| level | horizon | statistic | p_value | series | models | mean_ranks | critical_difference |
|---|---|---|---|---|---|---|---|
| category | 1 | 45.8857 | 2.499e-07 | 14 | 9 | {"chronos_fine_tuned": 2.7142857142857144, "sba": 3.0, "chronos_zero_shot": 4.142857142857143, "tsb": 4.571428571428571, "naive": 4.642857142857143, "ses": 5.071428571428571, "croston": 5.571428571428571, "two_stage_trees": 7.571428571428571, "global_gbm": 7.714285714285714} | 3.2106 |
| category | 3 | 56.4571 | 2.298e-09 | 14 | 9 | {"sba": 2.357142857142857, "chronos_fine_tuned": 2.5714285714285716, "ses": 4.357142857142857, "tsb": 4.357142857142857, "naive": 4.857142857142857, "chronos_zero_shot": 5.142857142857143, "croston": 5.714285714285714, "two_stage_trees": 7.642857142857143, "global_gbm": 8.0} | 3.2106 |
| sku | 1 | 1679.6755 | 0 | 356 | 9 | {"naive": 2.050561797752809, "chronos_fine_tuned": 3.1292134831460676, "global_gbm": 3.308988764044944, "chronos_zero_shot": 3.8202247191011236, "tsb": 5.311797752808989, "ses": 5.418539325842697, "two_stage_trees": 6.134831460674158, "sba": 7.47191011235955, "croston": 8.353932584269662} | 0.6367 |
| sku | 3 | 1512.8853 | 0 | 384 | 9 | {"naive": 2.6419270833333335, "chronos_fine_tuned": 2.89453125, "global_gbm": 3.3880208333333335, "chronos_zero_shot": 4.114583333333333, "ses": 5.229166666666667, "tsb": 5.338541666666667, "two_stage_trees": 5.963541666666667, "sba": 7.309895833333333, "croston": 8.119791666666666} | 0.6130 |

## Table D3 (Monthly). Diebold-Mariano tests per series (Holm-adjusted)

| horizon | model_a | model_b | series_tested | a_better | b_better | median_statistic |
|---|---|---|---|---|---|---|
| 1 | ses | naive | 371 | 0 | 33 | 1.3208 |
| 1 | croston | naive | 371 | 0 | 8 | 2.4004 |
| 1 | sba | naive | 371 | 0 | 23 | 2.5131 |
| 1 | tsb | naive | 371 | 0 | 0 | 2.0254 |
| 1 | two_stage_trees | naive | 457 | 0 | 0 | 1.5807 |
| 1 | global_gbm | naive | 457 | 0 | 0 | 1.2404 |
| 1 | chronos_zero_shot | naive | 360 | 0 | 0 | 1.1747 |
| 1 | chronos_fine_tuned | naive | 364 | 0 | 0 | 1.1653 |
| 1 | sba | croston | 371 | 1 | 16 | -1.7406 |
| 1 | tsb | croston | 371 | 6 | 0 | -2.1536 |
| 1 | global_gbm | two_stage_trees | 457 | 0 | 0 | -1.5804 |
| 1 | chronos_fine_tuned | chronos_zero_shot | 370 | 0 | 0 | -0.9999 |
| 3 | ses | naive | 357 | 4 | 4 | 0.8096 |
| 3 | croston | naive | 342 | 0 | 4 | 1.4247 |
| 3 | sba | naive | 350 | 1 | 21 | 1.4702 |
| 3 | tsb | naive | 364 | 2 | 0 | 0.9905 |
| 3 | two_stage_trees | naive | 419 | 1 | 4 | 0.9518 |
| 3 | global_gbm | naive | 415 | 2 | 13 | 0.8665 |
| 3 | chronos_zero_shot | naive | 353 | 5 | 9 | 0.9023 |
| 3 | chronos_fine_tuned | naive | 349 | 4 | 4 | 0.7505 |
| 3 | sba | croston | 363 | 3 | 4 | -1.0836 |
| 3 | tsb | croston | 356 | 6 | 0 | -1.2056 |
| 3 | global_gbm | two_stage_trees | 422 | 4 | 0 | -1.0959 |
| 3 | chronos_fine_tuned | chronos_zero_shot | 348 | 4 | 1 | -0.7661 |

## Table D4 (Monthly). Inventory simulation, primary scenario

| level | model | fill_rate | mean_on_hand | mean_safety_stock | lost_units | lost_value | target_reached |
|---|---|---|---|---|---|---|---|
| category | chronos_fine_tuned | 0.9438 | 19.3810 | 13.0500 | 71 | 56807.0465 | 1 |
| category | chronos_zero_shot | 0.9375 | 21.2976 | 9.1696 | 74 | 50571.8475 | 1 |
| category | croston | 0.9588 | 18.1190 | 3.0481 | 58 | 38585.2057 | 1 |
| category | global_gbm | 0.9730 | 30.7262 | 3.2037 | 45 | 30949.2148 | 1 |
| category | naive | 0.9277 | 27.2857 | 12.4419 | 60 | 33488.7741 | 1 |
| category | sba | 0.9247 | 15.9048 | 7.2793 | 82 | 62160.1395 | 1 |
| category | ses | 0.9229 | 18.0833 | 5.9587 | 91 | 63245.3305 | 1 |
| category | tsb | 0.9456 | 16.5595 | 4.2420 | 71 | 51332.1230 | 1 |
| category | two_stage_trees | 0.9707 | 34.8333 | 3.0466 | 47 | 31404.2174 | 1 |
| sku | chronos_fine_tuned | 0.9899 | 1.8665 | 1.3051 | 25 | 5184.9672 | 0.8688 |
| sku | chronos_zero_shot | 0.9879 | 2.0939 | 1.1478 | 27 | 5179.9612 | 0.8824 |
| sku | croston | 0.9935 | 3.8348 | 1.0742 | 20 | 3359.9922 | 0.8733 |
| sku | global_gbm | 0.9924 | 2.3062 | 1.2161 | 21 | 3554.9922 | 0.8733 |
| sku | naive | 0.9616 | 1.7854 | 1.0209 | 40 | 7989.9902 | 0.8824 |
| sku | sba | 0.9904 | 3.4280 | 1.0925 | 28 | 5999.9744 | 0.8733 |
| sku | ses | 0.9913 | 2.0008 | 0.9426 | 23 | 5885.0056 | 0.8801 |
| sku | tsb | 0.9899 | 1.9977 | 0.9214 | 27 | 5392.4706 | 0.8824 |
| sku | two_stage_trees | 0.9845 | 2.4676 | 0.8215 | 32 | 9975.8246 | 0.9548 |
| total | chronos_fine_tuned | 0.9205 | 163.6667 | 35.1391 | 60 | 42520.7942 | 1 |
| total | chronos_zero_shot | 0.9629 | 231.6667 | 35.1391 | 28 | 19843.0373 | 1 |
| total | croston | 0.9974 | 183.3333 | 0 | 2 | 1417.3598 | 1 |
| total | global_gbm | 1 | 390.1667 | 0 | 0 | 0 | 1 |
| total | naive | 0.9642 | 213 | 70.2783 | 27 | 19134.3574 | 1 |
| total | sba | 0.8517 | 120.5000 | 0 | 112 | 79372.1491 | 1 |
| total | ses | 0.8834 | 145.3333 | 0 | 88 | 62363.8314 | 1 |
| total | tsb | 0.9272 | 159 | 0 | 55 | 38977.3946 | 1 |
| total | two_stage_trees | 1 | 318.8333 | 0 | 0 | 0 | 1 |

## Table D5 (Monthly). Spearman between the MASE and fill-rate rankings

| level | rho | ci_low | ci_high | resamples | models | below_threshold |
|---|---|---|---|---|---|---|
| category | -0.5833 | -0.8835 | -0.2184 | 1000 | 9 | yes |
| sku | -0.4500 | -0.6500 | -0.0667 | 1000 | 9 | yes |
| total | -0.7615 | -0.7615 | -0.7615 | 1000 | 9 | yes |

## Table D6 (Monthly). HE3 robustness: break, truncated history, expanding window

| condition | level | horizon | statistic | p_value | series |
|---|---|---|---|---|---|
| truncated | category | 1 | 11.3333 | 0.1835 | 14 |
| truncated | category | 3 | 49.4286 | 5.262e-08 | 14 |
| truncated | sku | 1 | 98.0835 | 1.051e-17 | 94 |
| truncated | sku | 3 | 391.9580 | 9.83e-80 | 127 |
| expanding | category | 1 | 7.0756 | 0.5285 | 14 |
| expanding | category | 3 | 16.9291 | 0.0309 | 14 |
| expanding | sku | 1 | 149.8588 | 2.098e-28 | 96 |
| expanding | sku | 3 | 230.1821 | 2.71e-45 | 129 |
