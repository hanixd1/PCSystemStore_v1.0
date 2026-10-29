# F7 statistical comparison - monthly (internal validation, development span)

## he1_friedman (channel total)

| channel | level | horizon | statistic | p_value | series | models | mean_ranks | critical_difference |
|---|---|---|---|---|---|---|---|---|
| total | category | 1 | 36.5524 | 1.391e-05 | 14 | 9 | {"sba": 2.7857142857142856, "chronos_fine_tuned": 3.142857142857143, "chronos_zero_shot": 4.214285714285714, "ses": 4.428571428571429, "tsb": 4.785714285714286, "naive": 5.428571428571429, "croston": 5.928571428571429, "global_gbm": 7.071428571428571, "two_stage_trees": 7.214285714285714} | 3.2106 |
| total | category | 3 | 28.6476 | 0.0004 | 14 | 9 | {"sba": 3.142857142857143, "naive": 4.071428571428571, "chronos_fine_tuned": 4.142857142857143, "chronos_zero_shot": 4.142857142857143, "ses": 4.357142857142857, "tsb": 5.071428571428571, "croston": 6.142857142857143, "global_gbm": 6.714285714285714, "two_stage_trees": 7.214285714285714} | 3.2106 |
| total | sku | 1 | 1277.0903 | 2.103e-270 | 441 | 9 | {"chronos_fine_tuned": 2.6904761904761907, "naive": 3.0430839002267573, "chronos_zero_shot": 3.824263038548753, "global_gbm": 4.2811791383219955, "ses": 5.344671201814059, "tsb": 5.471655328798186, "two_stage_trees": 6.1519274376417235, "sba": 6.786848072562358, "croston": 7.405895691609977} | 0.5720 |
| total | sku | 3 | 1138.2795 | 2.068e-240 | 435 | 9 | {"chronos_fine_tuned": 3.0011494252873563, "naive": 3.3195402298850576, "global_gbm": 3.6482758620689655, "chronos_zero_shot": 4.070114942528735, "ses": 5.44367816091954, "tsb": 5.464367816091954, "two_stage_trees": 5.852873563218391, "sba": 6.827586206896552, "croston": 7.372413793103449} | 0.5760 |

## he1_diebold_mariano (channel total)

| channel | horizon | model_a | model_b | series_tested | a_better | b_better | median_statistic |
|---|---|---|---|---|---|---|---|
| total | 1 | ses | naive | 456 | 0 | 23 | 1.0029 |
| total | 1 | croston | naive | 456 | 0 | 15 | 1.5233 |
| total | 1 | sba | naive | 456 | 0 | 47 | 1.4780 |
| total | 1 | tsb | naive | 456 | 0 | 0 | 1.6066 |
| total | 1 | two_stage_trees | naive | 457 | 0 | 6 | 1.6035 |
| total | 1 | global_gbm | naive | 457 | 0 | 0 | 1.0967 |
| total | 1 | chronos_zero_shot | naive | 452 | 0 | 0 | 1.0531 |
| total | 1 | chronos_fine_tuned | naive | 443 | 0 | 0 | 1.0000 |
| total | 1 | sba | croston | 456 | 1 | 15 | -1.3388 |
| total | 1 | tsb | croston | 456 | 11 | 0 | -1.3956 |
| total | 1 | global_gbm | two_stage_trees | 457 | 6 | 0 | -1.5692 |
| total | 1 | chronos_fine_tuned | chronos_zero_shot | 457 | 0 | 0 | -0.9788 |
| total | 3 | ses | naive | 396 | 4 | 2 | 0.7539 |
| total | 3 | croston | naive | 378 | 0 | 7 | 1.4939 |
| total | 3 | sba | naive | 374 | 1 | 16 | 1.4694 |
| total | 3 | tsb | naive | 402 | 2 | 0 | 0.9821 |
| total | 3 | two_stage_trees | naive | 395 | 4 | 1 | 0.9432 |
| total | 3 | global_gbm | naive | 397 | 5 | 6 | 0.8017 |
| total | 3 | chronos_zero_shot | naive | 382 | 6 | 15 | 0.7728 |
| total | 3 | chronos_fine_tuned | naive | 386 | 10 | 4 | 0.7810 |
| total | 3 | sba | croston | 389 | 3 | 2 | -0.8555 |
| total | 3 | tsb | croston | 390 | 5 | 1 | -0.8702 |
| total | 3 | global_gbm | two_stage_trees | 407 | 1 | 0 | -0.9506 |
| total | 3 | chronos_fine_tuned | chronos_zero_shot | 399 | 21 | 1 | -0.7148 |

## he2_spearman (channel total)

| channel | level | rho | ci_low | ci_high | resamples | models | below_threshold |
|---|---|---|---|---|---|---|---|
| total | category | -0.8833 | -0.9791 | 0.0174 | 1000 | 9 | yes |
| total | sku | -0.8833 | -0.9333 | -0.5333 | 1000 | 9 | yes |
| total | total | -0.6436 | -0.6436 | -0.6436 | 1000 | 9 | yes |

## he3_robustness (channel total)

| condition | channel | level | horizon | statistic | p_value | series | models | mean_ranks | critical_difference | median_change |
|---|---|---|---|---|---|---|---|---|---|---|
| truncated | total | category | 1 | 27.2762 | 0.0006 | 14 | 9 | {"chronos_fine_tuned": 3.857142857142857, "sba": 4.142857142857143, "croston": 4.5, "naive": 4.5, "tsb": 4.5, "two_stage_trees": 4.857142857142857, "ses": 5.0, "chronos_zero_shot": 5.214285714285714, "global_gbm": 8.428571428571429} | 3.2106 | {"chronos_fine_tuned": 0.059096075537035886, "chronos_zero_shot": 0.04241996588315211, "croston": 0.059116404624828145, "global_gbm": 0.513150701623316, "naive": 0.069251897356296, "sba": 0.047325575136513254, "ses": 0.07763626041640825, "tsb": 0.0431071242668043, "two_stage_trees": 0.058688012901755515} |
| truncated | total | category | 3 | 12.2095 | 0.1421 | 14 | 9 | {"global_gbm": 3.7142857142857144, "two_stage_trees": 4.0, "chronos_zero_shot": 4.357142857142857, "chronos_fine_tuned": 4.571428571428571, "ses": 5.0, "naive": 5.428571428571429, "tsb": 5.571428571428571, "sba": 6.142857142857143, "croston": 6.214285714285714} | 3.2106 | {"chronos_fine_tuned": -0.05323272373093374, "chronos_zero_shot": -0.14084730783428712, "croston": 0.008496920034241129, "global_gbm": -0.2686925501555432, "naive": 0.026720762277304688, "sba": 0.03886123565947308, "ses": 0.030251412972107428, "tsb": 6.676457024368254e-05, "two_stage_trees": -0.25116678597140957} |
| truncated | total | sku | 1 | 165.4765 | 1.143e-31 | 204 | 9 | {"ses": 3.9877450980392157, "naive": 4.061274509803922, "tsb": 4.328431372549019, "two_stage_trees": 4.666666666666667, "chronos_fine_tuned": 4.754901960784314, "global_gbm": 5.171568627450981, "sba": 5.465686274509804, "croston": 6.186274509803922, "chronos_zero_shot": 6.377450980392157} | 0.8411 | {"chronos_fine_tuned": -0.29148992896993103, "chronos_zero_shot": -0.14468828439404746, "croston": -0.07439239199368475, "global_gbm": -0.1694700210197997, "naive": -0.3035586704317355, "sba": -0.12447579286212807, "ses": -0.3445961141244031, "tsb": -0.302766878676287, "two_stage_trees": -0.20318170322877988} |
| truncated | total | sku | 3 | 359.6615 | 7.838e-73 | 196 | 9 | {"naive": 3.433673469387755, "ses": 3.4489795918367347, "tsb": 3.7857142857142856, "two_stage_trees": 4.729591836734694, "sba": 5.063775510204081, "global_gbm": 5.153061224489796, "croston": 5.875, "chronos_zero_shot": 6.316326530612245, "chronos_fine_tuned": 7.1938775510204085} | 0.8581 | {"chronos_fine_tuned": 0.37018609751707554, "chronos_zero_shot": 0.10118352699021183, "croston": 0.02058007953095453, "global_gbm": -0.2084010608077287, "naive": -0.3557990184536258, "sba": -0.0976792713761861, "ses": -0.3912762471018025, "tsb": -0.3408138351122811, "two_stage_trees": -0.14597181539606074} |
| expanding | total | category | 1 | 12.3169 | 0.1376 | 14 | 9 | {"croston": 3.857142857142857, "tsb": 4.5, "chronos_fine_tuned": 4.642857142857143, "sba": 4.642857142857143, "chronos_zero_shot": 4.714285714285714, "two_stage_trees": 4.714285714285714, "naive": 4.892857142857143, "global_gbm": 6.5, "ses": 6.535714285714286} | 3.2106 | {"chronos_fine_tuned": -0.02322338250753514, "chronos_zero_shot": 0.021224481741187518, "croston": -0.02029567022563239, "global_gbm": 0.03131575859441571, "naive": -0.0026659102436384363, "sba": -0.003962311826892273, "ses": 0.04708646344020473, "tsb": -0.004006402937754672, "two_stage_trees": -0.019049221547601858} |
| expanding | total | category | 3 | 9.8667 | 0.2745 | 14 | 9 | {"global_gbm": 3.357142857142857, "chronos_fine_tuned": 4.428571428571429, "two_stage_trees": 4.5, "naive": 5.0, "chronos_zero_shot": 5.285714285714286, "sba": 5.285714285714286, "tsb": 5.357142857142857, "ses": 5.642857142857143, "croston": 6.142857142857143} | 3.2106 | {"chronos_fine_tuned": 0.022579001469386184, "chronos_zero_shot": 0.05742826285241209, "croston": 0.009813999191837286, "global_gbm": 0.01012696793791712, "naive": -0.0004821111822447266, "sba": -0.0008452871169822296, "ses": 0.05836678650750493, "tsb": 0.00016174920470030107, "two_stage_trees": -0.039096847731856676} |
| expanding | total | sku | 1 | 239.5551 | 2.813e-47 | 204 | 9 | {"croston": 3.3088235294117645, "sba": 3.9019607843137254, "chronos_zero_shot": 4.0931372549019605, "two_stage_trees": 4.686274509803922, "tsb": 5.328431372549019, "global_gbm": 5.568627450980392, "chronos_fine_tuned": 5.779411764705882, "ses": 6.041666666666667, "naive": 6.291666666666667} | 0.8411 | {"chronos_fine_tuned": 0.193364947303013, "chronos_zero_shot": 0.15753220759456532, "croston": 0.09878167264172633, "global_gbm": 0.20229915603222115, "naive": 0.20466165371540657, "sba": 0.11893324331395438, "ses": 0.20654217966695054, "tsb": 0.2038373521754251, "two_stage_trees": 0.1804265362543126} |
| expanding | total | sku | 3 | 198.4266 | 1.371e-38 | 197 | 9 | {"croston": 3.6218274111675126, "chronos_zero_shot": 4.16243654822335, "sba": 4.175126903553299, "two_stage_trees": 4.710659898477157, "chronos_fine_tuned": 4.99492385786802, "global_gbm": 5.035532994923858, "tsb": 5.522842639593908, "ses": 6.256345177664975, "naive": 6.520304568527918} | 0.8559 | {"chronos_fine_tuned": 0.13574477738343527, "chronos_zero_shot": 0.10821812544781184, "croston": 0.07038493066822737, "global_gbm": 0.14615844344206397, "naive": 0.14716861751384958, "sba": 0.08107216905965942, "ses": 0.149369735527068, "tsb": 0.1471228643298652, "two_stage_trees": 0.12354063827728545} |
