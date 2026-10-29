# Amendment v5: frozen vs corrected final test

Frozen: v1.0.0-research-freeze (commit 2786a20 opening). Corrected: v1.1.0-amendment-v5 (clone, commit 05fe34a opening). Channel total unless stated.

## Test demand by month (level total, units)

| month   |   ('facturado', 'corrected') |   ('facturado', 'frozen') |   ('total', 'corrected') |   ('total', 'frozen') |   ('vecinos', 'corrected') |   ('vecinos', 'frozen') |
|:--------|-----------------------------:|--------------------------:|-------------------------:|----------------------:|---------------------------:|------------------------:|
| 2026-03 |                          145 |                       145 |                      203 |                   203 |                         58 |                      58 |
| 2026-04 |                          207 |                       207 |                      233 |                   233 |                         26 |                      26 |
| 2026-05 |                           96 |                        96 |                      112 |                   124 |                         16 |                      28 |
| 2026-06 |                           46 |                        46 |                       58 |                    46 |                         12 |                       0 |
| 2026-07 |                           26 |                        26 |                       41 |                    41 |                         15 |                      15 |
| 2026-08 |                           66 |                        66 |                      108 |                   108 |                         42 |                      42 |

## Mean MASE, weekly, h = 1

| model              |   category frozen |   category corrected |   sku frozen |   sku corrected |   total frozen |   total corrected |
|:-------------------|------------------:|---------------------:|-------------:|----------------:|---------------:|------------------:|
| chronos_fine_tuned |             0.654 |                0.647 |        0.178 |           0.178 |          0.851 |             0.814 |
| chronos_zero_shot  |             0.713 |                0.697 |        0.232 |           0.233 |          0.898 |             0.858 |
| croston            |             0.827 |                0.8   |        4.774 |           4.776 |          0.954 |             0.94  |
| global_gbm         |             0.857 |                0.839 |        0.305 |           0.305 |          1.165 |             1.179 |
| naive              |             0.978 |                0.947 |        0.325 |           0.325 |          1.31  |             1.247 |
| sba                |             0.755 |                0.74  |        3.995 |           3.996 |          0.878 |             0.841 |
| ses                |             0.831 |                0.813 |        0.405 |           0.406 |          1.005 |             0.996 |
| tsb                |             0.789 |                0.774 |        0.323 |           0.324 |          0.922 |             0.895 |
| two_stage_trees    |             0.877 |                0.845 |        1.862 |           1.887 |          1.177 |             1.166 |

## Friedman on MASE, weekly

| version   | level    |   h |   series |    chi2 |        p | best                      | worst                  |
|:----------|:---------|----:|---------:|--------:|---------:|:--------------------------|:-----------------------|
| corrected | category |   1 |       14 |   77.83 | 1.3e-13  | chronos_fine_tuned (1.14) | naive (8.29)           |
| frozen    | category |   1 |       14 |   76.29 | 2.7e-13  | chronos_fine_tuned (1.07) | naive (8.29)           |
| corrected | category |   4 |       14 |   67.77 | 1.4e-11  | chronos_fine_tuned (1.29) | naive (7.43)           |
| frozen    | category |   4 |       14 |   68.82 | 8.4e-12  | chronos_fine_tuned (1.29) | two_stage_trees (7.50) |
| corrected | sku      |   1 |      279 | 1424.05 | 3.6e-302 | naive (2.21)              | croston (8.51)         |
| frozen    | sku      |   1 |      279 | 1420.58 | 2e-301   | naive (2.23)              | croston (8.50)         |
| corrected | sku      |   4 |      288 | 1437.15 | 5.3e-305 | naive (2.31)              | croston (8.44)         |
| frozen    | sku      |   4 |      288 | 1455.26 | 6.4e-309 | naive (2.28)              | croston (8.46)         |

## Spearman MASE vs fill rate, weekly

| version   | level    |    rho | CI             | upper < 0.5   |
|:----------|:---------|-------:|:---------------|:--------------|
| corrected | category | -0.267 | -0.55 to 0.15  | True          |
| frozen    | category | -0.209 | -0.68 to 0.13  | True          |
| corrected | sku      | -0.343 | -0.78 to 0.56  | False         |
| frozen    | sku      | -0.41  | -0.81 to 0.58  | False         |
| corrected | total    | -0.433 | -0.43 to -0.43 | True          |
| frozen    | total    | -0.417 | -0.42 to -0.42 | True          |

## Primary inventory scenario, weekly

|                                    |   fill frozen |   stock frozen |   fill corrected |   stock corrected |
|:-----------------------------------|--------------:|---------------:|-----------------:|------------------:|
| ('category', 'chronos_fine_tuned') |         0.9   |          9.159 |            0.903 |             9.049 |
| ('category', 'chronos_zero_shot')  |         0.911 |          9.313 |            0.915 |             9.187 |
| ('category', 'croston')            |         0.915 |          9.635 |            0.915 |             9.486 |
| ('category', 'global_gbm')         |         0.906 |          9.261 |            0.905 |             9.033 |
| ('category', 'naive')              |         0.94  |         18.646 |            0.932 |            18.107 |
| ('category', 'sba')                |         0.918 |         10.129 |            0.92  |            10.014 |
| ('category', 'ses')                |         0.924 |          9.896 |            0.925 |             9.701 |
| ('category', 'tsb')                |         0.923 |         10.093 |            0.924 |             9.984 |
| ('category', 'two_stage_trees')    |         0.896 |          9.363 |            0.899 |             9.019 |
| ('sku', 'chronos_fine_tuned')      |         0.987 |          2.113 |            0.987 |             2.114 |
| ('sku', 'chronos_zero_shot')       |         0.989 |          2.076 |            0.988 |             2.077 |
| ('sku', 'croston')                 |         0.987 |          2.51  |            0.987 |             2.51  |
| ('sku', 'global_gbm')              |         0.989 |          2.098 |            0.989 |             2.098 |
| ('sku', 'naive')                   |         0.98  |          1.873 |            0.98  |             1.871 |
| ('sku', 'sba')                     |         0.987 |          2.329 |            0.987 |             2.33  |
| ('sku', 'ses')                     |         0.986 |          1.788 |            0.986 |             1.788 |
| ('sku', 'tsb')                     |         0.985 |          1.754 |            0.985 |             1.754 |
| ('sku', 'two_stage_trees')         |         0.986 |          1.831 |            0.985 |             1.83  |
| ('total', 'chronos_fine_tuned')    |         0.847 |         37.885 |            0.854 |            37.654 |
| ('total', 'chronos_zero_shot')     |         0.822 |         33.192 |            0.822 |            33     |
| ('total', 'croston')               |         0.842 |         37.808 |            0.841 |            37.038 |
| ('total', 'global_gbm')            |         0.882 |         42.077 |            0.885 |            41.538 |
| ('total', 'naive')                 |         0.972 |         95.538 |            0.96  |            92.577 |
| ('total', 'sba')                   |         0.895 |         48.308 |            0.893 |            47     |
| ('total', 'ses')                   |         0.908 |         51.962 |            0.907 |            50.538 |
| ('total', 'tsb')                   |         0.889 |         46.615 |            0.886 |            45.385 |
| ('total', 'two_stage_trees')       |         0.875 |         41.077 |            0.874 |            40.923 |

## Strata summary, weekly (four channels)

| version   | HE1 strata rejecting   | HE2a fill-rate strata rejecting   | HE3 strata rejecting   | HE2b upper CI < 0.5   |
|:----------|:-----------------------|:----------------------------------|:-----------------------|:----------------------|
| frozen    | 16/16                  | 13/32                             | 32/32                  | 9/12                  |
| corrected | 16/16                  | 13/32                             | 32/32                  | 8/12                  |

## Mean MASE, monthly, h = 1

| model              |   category frozen |   category corrected |   sku frozen |   sku corrected |   total frozen |   total corrected |
|:-------------------|------------------:|---------------------:|-------------:|----------------:|---------------:|------------------:|
| chronos_fine_tuned |             0.598 |                0.584 |        0.143 |           0.143 |          0.694 |             0.699 |
| chronos_zero_shot  |             0.675 |                0.667 |        0.205 |           0.205 |          0.784 |             0.765 |
| croston            |             0.819 |                0.805 |        3.084 |           3.085 |          0.927 |             0.924 |
| global_gbm         |             1.094 |                1.005 |        0.208 |           0.206 |          1.505 |             1.303 |
| naive              |             0.705 |                0.683 |        0.224 |           0.227 |          0.683 |             0.683 |
| sba                |             0.64  |                0.625 |        2.627 |           2.627 |          0.754 |             0.748 |
| ses                |             0.732 |                0.724 |        0.367 |           0.367 |          0.68  |             0.677 |
| tsb                |             0.728 |                0.717 |        0.359 |           0.359 |          0.775 |             0.771 |
| two_stage_trees    |             1.172 |                1.136 |        0.584 |           0.584 |          1.279 |             1.231 |

## Friedman on MASE, monthly

| version   | level    |   h |   series |    chi2 |       p | best                      | worst                  |
|:----------|:---------|----:|---------:|--------:|--------:|:--------------------------|:-----------------------|
| corrected | category |   1 |       14 |   45.64 | 2.8e-07 | chronos_fine_tuned (2.79) | two_stage_trees (7.64) |
| frozen    | category |   1 |       14 |   45.89 | 2.5e-07 | chronos_fine_tuned (2.71) | global_gbm (7.71)      |
| corrected | category |   3 |       14 |   58.69 | 8.4e-10 | chronos_fine_tuned (2.50) | global_gbm (8.07)      |
| frozen    | category |   3 |       14 |   56.46 | 2.3e-09 | sba (2.36)                | global_gbm (8.00)      |
| corrected | sku      |   1 |      356 | 1683.84 | 0       | naive (2.08)              | croston (8.35)         |
| frozen    | sku      |   1 |      356 | 1679.68 | 0       | naive (2.05)              | croston (8.35)         |
| corrected | sku      |   3 |      384 | 1513.77 | 0       | naive (2.64)              | croston (8.12)         |
| frozen    | sku      |   3 |      384 | 1512.89 | 0       | naive (2.64)              | croston (8.12)         |

## Spearman MASE vs fill rate, monthly

| version   | level    |    rho | CI             | upper < 0.5   |
|:----------|:---------|-------:|:---------------|:--------------|
| corrected | category | -0.628 | -0.90 to -0.28 | True          |
| frozen    | category | -0.583 | -0.88 to -0.22 | True          |
| corrected | sku      | -0.45  | -0.65 to -0.07 | True          |
| frozen    | sku      | -0.45  | -0.65 to -0.07 | True          |
| corrected | total    | -0.745 | -0.74 to -0.74 | True          |
| frozen    | total    | -0.762 | -0.76 to -0.76 | True          |

## Primary inventory scenario, monthly

|                                    |   fill frozen |   stock frozen |   fill corrected |   stock corrected |
|:-----------------------------------|--------------:|---------------:|-----------------:|------------------:|
| ('category', 'chronos_fine_tuned') |         0.944 |         19.381 |            0.94  |            19.179 |
| ('category', 'chronos_zero_shot')  |         0.938 |         21.298 |            0.938 |            21.024 |
| ('category', 'croston')            |         0.959 |         18.119 |            0.959 |            17.929 |
| ('category', 'global_gbm')         |         0.973 |         30.726 |            0.973 |            30.536 |
| ('category', 'naive')              |         0.928 |         27.286 |            0.929 |            27.071 |
| ('category', 'sba')                |         0.925 |         15.905 |            0.923 |            15.81  |
| ('category', 'ses')                |         0.923 |         18.083 |            0.923 |            17.881 |
| ('category', 'tsb')                |         0.946 |         16.56  |            0.946 |            16.44  |
| ('category', 'two_stage_trees')    |         0.971 |         34.833 |            0.973 |            34.833 |
| ('sku', 'chronos_fine_tuned')      |         0.99  |          1.867 |            0.99  |             1.868 |
| ('sku', 'chronos_zero_shot')       |         0.988 |          2.094 |            0.988 |             2.094 |
| ('sku', 'croston')                 |         0.994 |          3.835 |            0.994 |             3.836 |
| ('sku', 'global_gbm')              |         0.992 |          2.306 |            0.992 |             2.305 |
| ('sku', 'naive')                   |         0.962 |          1.785 |            0.962 |             1.786 |
| ('sku', 'sba')                     |         0.99  |          3.428 |            0.99  |             3.429 |
| ('sku', 'ses')                     |         0.991 |          2.001 |            0.991 |             2.001 |
| ('sku', 'tsb')                     |         0.99  |          1.998 |            0.99  |             1.997 |
| ('sku', 'two_stage_trees')         |         0.984 |          2.468 |            0.984 |             2.467 |
| ('total', 'chronos_fine_tuned')    |         0.921 |        163.667 |            0.921 |           155.333 |
| ('total', 'chronos_zero_shot')     |         0.963 |        231.667 |            0.963 |           233.667 |
| ('total', 'croston')               |         0.997 |        183.333 |            0.997 |           179.667 |
| ('total', 'global_gbm')            |         1     |        390.167 |            1     |           382.833 |
| ('total', 'naive')                 |         0.964 |        213     |            0.964 |           215     |
| ('total', 'sba')                   |         0.852 |        120.5   |            0.852 |           116.5   |
| ('total', 'ses')                   |         0.883 |        145.333 |            0.883 |           147.333 |
| ('total', 'tsb')                   |         0.927 |        159     |            0.927 |           154.333 |
| ('total', 'two_stage_trees')       |         1     |        318.833 |            1     |           315.833 |

## Strata summary, monthly (four channels)

| version   | HE1 strata rejecting   | HE2a fill-rate strata rejecting   | HE3 strata rejecting   | HE2b upper CI < 0.5   |
|:----------|:-----------------------|:----------------------------------|:-----------------------|:----------------------|
| frozen    | 16/16                  | 32/32                             | 21/32                  | 11/12                 |
| corrected | 16/16                  | 32/32                             | 22/32                  | 11/12                 |
