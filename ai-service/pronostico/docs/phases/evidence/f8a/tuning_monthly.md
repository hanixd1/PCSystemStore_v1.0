# Hyperparameter search - monthly (20261024T185418Z-monthly-tuning)

Origins: 8 (stride 1); series trained: 1728; scored (channel total): 457.

| model           |   candidate | params                                                                                 |   mean_mase |   series_horizons_scored |   failures |   seconds |
|:----------------|------------:|:---------------------------------------------------------------------------------------|------------:|-------------------------:|-----------:|----------:|
| croston         |           0 | {"alpha": 0.1}                                                                         |     2.98104 |                      456 |          0 |     0.061 |
| croston         |           1 | {"alpha": 0.05}                                                                        |     3.02914 |                      456 |          0 |     0.059 |
| croston         |           2 | {"alpha": 0.15}                                                                        |     2.95782 |                      456 |          0 |     0.058 |
| croston         |           3 | {"alpha": 0.2}                                                                         |     2.94907 |                      456 |          0 |     0.064 |
| croston         |           4 | {"alpha": 0.3}                                                                         |     2.9583  |                      456 |          0 |     0.059 |
| sba             |           0 | {"alpha": 0.1}                                                                         |     2.88543 |                      456 |          0 |     0.059 |
| sba             |           1 | {"alpha": 0.05}                                                                        |     2.98027 |                      456 |          0 |     0.062 |
| sba             |           2 | {"alpha": 0.15}                                                                        |     2.81598 |                      456 |          0 |     0.059 |
| sba             |           3 | {"alpha": 0.2}                                                                         |     2.76101 |                      456 |          0 |     0.062 |
| sba             |           4 | {"alpha": 0.3}                                                                         |     2.67677 |                      456 |          0 |     0.059 |
| tsb             |           0 | {"alpha_d": 0.1, "alpha_p": 0.1}                                                       |     1.58552 |                      456 |          0 |     0.09  |
| tsb             |           1 | {"alpha_d": 0.05, "alpha_p": 0.05}                                                     |     1.67697 |                      456 |          0 |     0.081 |
| tsb             |           2 | {"alpha_d": 0.05, "alpha_p": 0.1}                                                      |     1.59963 |                      456 |          0 |     0.078 |
| tsb             |           3 | {"alpha_d": 0.05, "alpha_p": 0.2}                                                      |     1.47617 |                      456 |          0 |     0.079 |
| tsb             |           4 | {"alpha_d": 0.05, "alpha_p": 0.3}                                                      |     1.40559 |                      456 |          0 |     0.083 |
| tsb             |           5 | {"alpha_d": 0.1, "alpha_p": 0.05}                                                      |     1.66276 |                      456 |          0 |     0.078 |
| tsb             |           6 | {"alpha_d": 0.1, "alpha_p": 0.2}                                                       |     1.46093 |                      456 |          0 |     0.086 |
| tsb             |           7 | {"alpha_d": 0.1, "alpha_p": 0.3}                                                       |     1.3885  |                      456 |          0 |     0.079 |
| tsb             |           8 | {"alpha_d": 0.2, "alpha_p": 0.05}                                                      |     1.64443 |                      456 |          0 |     0.076 |
| tsb             |           9 | {"alpha_d": 0.2, "alpha_p": 0.1}                                                       |     1.56776 |                      456 |          0 |     0.078 |
| tsb             |          10 | {"alpha_d": 0.2, "alpha_p": 0.2}                                                       |     1.44169 |                      456 |          0 |     0.078 |
| tsb             |          11 | {"alpha_d": 0.2, "alpha_p": 0.3}                                                       |     1.36733 |                      456 |          0 |     0.079 |
| tsb             |          12 | {"alpha_d": 0.3, "alpha_p": 0.05}                                                      |     1.63215 |                      456 |          0 |     0.085 |
| tsb             |          13 | {"alpha_d": 0.3, "alpha_p": 0.1}                                                       |     1.55586 |                      456 |          0 |     0.087 |
| tsb             |          14 | {"alpha_d": 0.3, "alpha_p": 0.2}                                                       |     1.42974 |                      456 |          0 |     0.085 |
| tsb             |          15 | {"alpha_d": 0.3, "alpha_p": 0.3}                                                       |     1.35488 |                      456 |          0 |     0.088 |
| two_stage_trees |           0 | {}                                                                                     |     3.95455 |                      456 |          0 |     5.481 |
| two_stage_trees |           1 | {"learning_rate": 0.03, "min_data_in_leaf": 20.0, "num_leaves": 7.0, "rounds": 100.0}  |     3.73095 |                      456 |          0 |     3.966 |
| two_stage_trees |           2 | {"learning_rate": 0.03, "min_data_in_leaf": 20.0, "num_leaves": 15.0, "rounds": 200.0} |     3.92913 |                      456 |          0 |     5.386 |
| two_stage_trees |           3 | {"learning_rate": 0.03, "min_data_in_leaf": 50.0, "num_leaves": 31.0, "rounds": 200.0} |     3.63338 |                      456 |          0 |     7.53  |
| two_stage_trees |           4 | {"learning_rate": 0.05, "min_data_in_leaf": 20.0, "num_leaves": 15.0, "rounds": 100.0} |     3.90458 |                      456 |          0 |     3.969 |
| two_stage_trees |           5 | {"learning_rate": 0.05, "min_data_in_leaf": 50.0, "num_leaves": 15.0, "rounds": 100.0} |     3.59851 |                      456 |          0 |     4.085 |
| two_stage_trees |           6 | {"learning_rate": 0.05, "min_data_in_leaf": 50.0, "num_leaves": 31.0, "rounds": 200.0} |     3.63476 |                      456 |          0 |     6.591 |
| two_stage_trees |           7 | {"learning_rate": 0.1, "min_data_in_leaf": 20.0, "num_leaves": 7.0, "rounds": 100.0}   |     3.94435 |                      456 |          0 |     3.459 |
| global_gbm      |           0 | {}                                                                                     |     3.02811 |                      456 |          0 |     3.649 |
| global_gbm      |           1 | {"learning_rate": 0.03, "min_data_in_leaf": 20.0, "num_leaves": 7.0, "rounds": 100.0}  |     3.0015  |                      456 |          0 |     2.804 |
| global_gbm      |           2 | {"learning_rate": 0.03, "min_data_in_leaf": 20.0, "num_leaves": 15.0, "rounds": 200.0} |     3.10442 |                      456 |          0 |     4.11  |
| global_gbm      |           3 | {"learning_rate": 0.03, "min_data_in_leaf": 50.0, "num_leaves": 31.0, "rounds": 200.0} |     2.56182 |                      456 |          0 |     5.383 |
| global_gbm      |           4 | {"learning_rate": 0.05, "min_data_in_leaf": 20.0, "num_leaves": 15.0, "rounds": 100.0} |     3.19113 |                      456 |          0 |     3.213 |
| global_gbm      |           5 | {"learning_rate": 0.05, "min_data_in_leaf": 50.0, "num_leaves": 15.0, "rounds": 100.0} |     3.11351 |                      456 |          0 |     3.204 |
| global_gbm      |           6 | {"learning_rate": 0.05, "min_data_in_leaf": 50.0, "num_leaves": 31.0, "rounds": 200.0} |     2.02326 |                      456 |          0 |     5.352 |
| global_gbm      |           7 | {"learning_rate": 0.1, "min_data_in_leaf": 20.0, "num_leaves": 7.0, "rounds": 100.0}   |     3.16907 |                      456 |          0 |     2.764 |
