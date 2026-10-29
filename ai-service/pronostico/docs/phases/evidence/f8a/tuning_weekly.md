# Hyperparameter search - weekly (20261024T184717Z-weekly-tuning)

Origins: 15 (stride 4); series trained: 1728; scored (channel total): 457.

| model           |   candidate | params                                                                                 |   mean_mase |   series_horizons_scored |   failures |   seconds |
|:----------------|------------:|:---------------------------------------------------------------------------------------|------------:|-------------------------:|-----------:|----------:|
| croston         |           0 | {"alpha": 0.1}                                                                         |     2.41334 |                      912 |          0 |     0.104 |
| croston         |           1 | {"alpha": 0.05}                                                                        |     2.4788  |                      912 |          0 |     0.1   |
| croston         |           2 | {"alpha": 0.15}                                                                        |     2.3954  |                      912 |          0 |     0.101 |
| croston         |           3 | {"alpha": 0.2}                                                                         |     2.39982 |                      912 |          0 |     0.101 |
| croston         |           4 | {"alpha": 0.3}                                                                         |     2.44601 |                      912 |          0 |     0.101 |
| sba             |           0 | {"alpha": 0.1}                                                                         |     2.32938 |                      912 |          0 |     0.1   |
| sba             |           1 | {"alpha": 0.05}                                                                        |     2.43511 |                      912 |          0 |     0.1   |
| sba             |           2 | {"alpha": 0.15}                                                                        |     2.27091 |                      912 |          0 |     0.1   |
| sba             |           3 | {"alpha": 0.2}                                                                         |     2.23352 |                      912 |          0 |     0.1   |
| sba             |           4 | {"alpha": 0.3}                                                                         |     2.18992 |                      912 |          0 |     0.1   |
| tsb             |           0 | {"alpha_d": 0.1, "alpha_p": 0.1}                                                       |     1.18535 |                      912 |          0 |     0.19  |
| tsb             |           1 | {"alpha_d": 0.05, "alpha_p": 0.05}                                                     |     1.22973 |                      912 |          0 |     0.189 |
| tsb             |           2 | {"alpha_d": 0.05, "alpha_p": 0.1}                                                      |     1.18916 |                      912 |          0 |     0.189 |
| tsb             |           3 | {"alpha_d": 0.05, "alpha_p": 0.2}                                                      |     1.17469 |                      912 |          0 |     0.189 |
| tsb             |           4 | {"alpha_d": 0.05, "alpha_p": 0.3}                                                      |     1.17342 |                      912 |          0 |     0.195 |
| tsb             |           5 | {"alpha_d": 0.1, "alpha_p": 0.05}                                                      |     1.22661 |                      912 |          0 |     0.19  |
| tsb             |           6 | {"alpha_d": 0.1, "alpha_p": 0.2}                                                       |     1.1702  |                      912 |          0 |     0.189 |
| tsb             |           7 | {"alpha_d": 0.1, "alpha_p": 0.3}                                                       |     1.16841 |                      912 |          0 |     0.189 |
| tsb             |           8 | {"alpha_d": 0.2, "alpha_p": 0.05}                                                      |     1.2235  |                      912 |          0 |     0.19  |
| tsb             |           9 | {"alpha_d": 0.2, "alpha_p": 0.1}                                                       |     1.18249 |                      912 |          0 |     0.19  |
| tsb             |          10 | {"alpha_d": 0.2, "alpha_p": 0.2}                                                       |     1.16698 |                      912 |          0 |     0.189 |
| tsb             |          11 | {"alpha_d": 0.2, "alpha_p": 0.3}                                                       |     1.16478 |                      912 |          0 |     0.191 |
| tsb             |          12 | {"alpha_d": 0.3, "alpha_p": 0.05}                                                      |     1.2212  |                      912 |          0 |     0.191 |
| tsb             |          13 | {"alpha_d": 0.3, "alpha_p": 0.1}                                                       |     1.18101 |                      912 |          0 |     0.19  |
| tsb             |          14 | {"alpha_d": 0.3, "alpha_p": 0.2}                                                       |     1.16595 |                      912 |          0 |     0.19  |
| tsb             |          15 | {"alpha_d": 0.3, "alpha_p": 0.3}                                                       |     1.16384 |                      912 |          0 |     0.189 |
| two_stage_trees |           0 | {}                                                                                     |     9.18191 |                      912 |          0 |    23.313 |
| two_stage_trees |           1 | {"learning_rate": 0.03, "min_data_in_leaf": 20.0, "num_leaves": 7.0, "rounds": 100.0}  |    10.3471  |                      912 |          0 |    19.874 |
| two_stage_trees |           2 | {"learning_rate": 0.03, "min_data_in_leaf": 20.0, "num_leaves": 15.0, "rounds": 200.0} |     9.24665 |                      912 |          0 |    25.936 |
| two_stage_trees |           3 | {"learning_rate": 0.03, "min_data_in_leaf": 50.0, "num_leaves": 31.0, "rounds": 200.0} |     8.96657 |                      912 |          0 |    30.889 |
| two_stage_trees |           4 | {"learning_rate": 0.05, "min_data_in_leaf": 20.0, "num_leaves": 15.0, "rounds": 100.0} |     9.4126  |                      912 |          0 |    22.283 |
| two_stage_trees |           5 | {"learning_rate": 0.05, "min_data_in_leaf": 50.0, "num_leaves": 15.0, "rounds": 100.0} |     9.21377 |                      912 |          0 |    22.236 |
| two_stage_trees |           6 | {"learning_rate": 0.05, "min_data_in_leaf": 50.0, "num_leaves": 31.0, "rounds": 200.0} |     9.28308 |                      912 |          0 |    33.666 |
| two_stage_trees |           7 | {"learning_rate": 0.1, "min_data_in_leaf": 20.0, "num_leaves": 7.0, "rounds": 100.0}   |     9.08357 |                      912 |          0 |    21.817 |
| global_gbm      |           0 | {}                                                                                     |     1.13945 |                      912 |          0 |    23.432 |
| global_gbm      |           1 | {"learning_rate": 0.03, "min_data_in_leaf": 20.0, "num_leaves": 7.0, "rounds": 100.0}  |     2.78435 |                      912 |          0 |    19.078 |
| global_gbm      |           2 | {"learning_rate": 0.03, "min_data_in_leaf": 20.0, "num_leaves": 15.0, "rounds": 200.0} |     1.1754  |                      912 |          0 |    28.857 |
| global_gbm      |           3 | {"learning_rate": 0.03, "min_data_in_leaf": 50.0, "num_leaves": 31.0, "rounds": 200.0} |     1.07089 |                      912 |          0 |    35.308 |
| global_gbm      |           4 | {"learning_rate": 0.05, "min_data_in_leaf": 20.0, "num_leaves": 15.0, "rounds": 100.0} |     1.22474 |                      912 |          0 |    21.172 |
| global_gbm      |           5 | {"learning_rate": 0.05, "min_data_in_leaf": 50.0, "num_leaves": 15.0, "rounds": 100.0} |     1.22474 |                      912 |          0 |    20.676 |
| global_gbm      |           6 | {"learning_rate": 0.05, "min_data_in_leaf": 50.0, "num_leaves": 31.0, "rounds": 200.0} |     1.01476 |                      912 |          0 |    31.175 |
| global_gbm      |           7 | {"learning_rate": 0.1, "min_data_in_leaf": 20.0, "num_leaves": 7.0, "rounds": 100.0}   |     1.3149  |                      912 |          0 |    20.705 |
