# F7 statistical comparison - weekly (internal validation, development span)

## he1_friedman (channel total)

| channel | level | horizon | statistic | p_value | series | models | mean_ranks | critical_difference |
|---|---|---|---|---|---|---|---|---|
| total | category | 1 | 73.2381 | 1.111e-12 | 14 | 9 | {"chronos_fine_tuned": 1.7857142857142858, "sba": 2.7142857142857144, "chronos_zero_shot": 2.9285714285714284, "tsb": 4.785714285714286, "croston": 5.071428571428571, "ses": 5.357142857142857, "global_gbm": 6.571428571428571, "two_stage_trees": 7.857142857142857, "naive": 7.928571428571429} | 3.2106 |
| total | category | 4 | 59.5619 | 5.681e-10 | 14 | 9 | {"chronos_fine_tuned": 2.2857142857142856, "sba": 2.5, "chronos_zero_shot": 3.5, "croston": 4.785714285714286, "ses": 5.0, "tsb": 5.071428571428571, "global_gbm": 6.857142857142857, "two_stage_trees": 7.357142857142857, "naive": 7.642857142857143} | 3.2106 |
| total | sku | 1 | 1809.4878 | 0.0000 | 442 | 9 | {"chronos_fine_tuned": 1.8235294117647058, "chronos_zero_shot": 3.076923076923077, "naive": 3.9524886877828056, "tsb": 4.4389140271493215, "global_gbm": 4.524886877828054, "ses": 5.52262443438914, "sba": 6.85972850678733, "croston": 7.298642533936651, "two_stage_trees": 7.502262443438914} | 0.5714 |
| total | sku | 4 | 1666.9836 | 0.0000 | 441 | 9 | {"chronos_fine_tuned": 1.9365079365079365, "chronos_zero_shot": 3.0090702947845807, "naive": 4.145124716553288, "global_gbm": 4.421768707482993, "tsb": 4.5895691609977325, "ses": 5.603174603174603, "sba": 6.750566893424036, "croston": 7.190476190476191, "two_stage_trees": 7.35374149659864} | 0.5720 |

## he1_diebold_mariano (channel total)

| channel | horizon | model_a | model_b | series_tested | a_better | b_better | median_statistic |
|---|---|---|---|---|---|---|---|
| total | 1 | ses | naive | 457 | 0 | 34 | -0.9742 |
| total | 1 | croston | naive | 457 | 0 | 24 | -0.2422 |
| total | 1 | sba | naive | 457 | 0 | 36 | -0.4655 |
| total | 1 | tsb | naive | 457 | 0 | 0 | -0.9312 |
| total | 1 | two_stage_trees | naive | 457 | 0 | 134 | 1.1448 |
| total | 1 | global_gbm | naive | 457 | 0 | 3 | -0.8961 |
| total | 1 | chronos_zero_shot | naive | 457 | 0 | 33 | -1.0008 |
| total | 1 | chronos_fine_tuned | naive | 457 | 0 | 32 | -0.9999 |
| total | 1 | sba | croston | 457 | 33 | 16 | -1.5585 |
| total | 1 | tsb | croston | 457 | 36 | 0 | -1.3702 |
| total | 1 | global_gbm | two_stage_trees | 457 | 164 | 0 | -2.4773 |
| total | 1 | chronos_fine_tuned | chronos_zero_shot | 457 | 5 | 0 | -0.6529 |
| total | 4 | ses | naive | 456 | 1 | 0 | -0.9850 |
| total | 4 | croston | naive | 456 | 1 | 10 | -0.5632 |
| total | 4 | sba | naive | 455 | 1 | 9 | -0.6712 |
| total | 4 | tsb | naive | 455 | 1 | 0 | -0.9913 |
| total | 4 | two_stage_trees | naive | 457 | 0 | 0 | 0.7706 |
| total | 4 | global_gbm | naive | 457 | 0 | 0 | -0.9827 |
| total | 4 | chronos_zero_shot | naive | 457 | 1 | 3 | -1.0041 |
| total | 4 | chronos_fine_tuned | naive | 457 | 0 | 0 | -1.0042 |
| total | 4 | sba | croston | 456 | 5 | 2 | -1.1048 |
| total | 4 | tsb | croston | 452 | 11 | 1 | -0.9647 |
| total | 4 | global_gbm | two_stage_trees | 457 | 1 | 0 | -1.3562 |
| total | 4 | chronos_fine_tuned | chronos_zero_shot | 455 | 0 | 0 | -0.8434 |

## he2_spearman (channel total)

| channel | level | rho | ci_low | ci_high | resamples | models | below_threshold |
|---|---|---|---|---|---|---|---|
| total | category | 0.4500 | -0.4167 | 0.5933 | 1000 | 9 | no |
| total | sku | -0.3500 | -0.5167 | 0.0000 | 1000 | 9 | yes |
| total | total | -0.2363 | -0.2363 | -0.2363 | 1000 | 9 | yes |

## he3_robustness (channel total)

| condition | channel | level | horizon | statistic | p_value | series | models | mean_ranks | critical_difference | median_change |
|---|---|---|---|---|---|---|---|---|---|---|
| break | total | category | 1 | 62.8571 | 1.278e-10 | 14 | 9 | {"sba": 2.642857142857143, "chronos_fine_tuned": 2.857142857142857, "tsb": 3.857142857142857, "naive": 4.214285714285714, "chronos_zero_shot": 4.571428571428571, "ses": 4.714285714285714, "croston": 5.714285714285714, "global_gbm": 7.928571428571429, "two_stage_trees": 8.5} | 3.2106 | {"chronos_fine_tuned": -0.4119035309886173, "chronos_zero_shot": -0.37128259602510877, "croston": -0.29131613042430904, "global_gbm": -0.21888494774637046, "naive": -0.31639564699747746, "sba": -0.3814734863704265, "ses": -0.3475207978946602, "tsb": -0.31380489600196615, "two_stage_trees": -0.11937773248678246} |
| break | total | category | 4 | 51.5429 | 2.062e-08 | 14 | 9 | {"chronos_fine_tuned": 3.2857142857142856, "sba": 3.2857142857142856, "naive": 3.642857142857143, "chronos_zero_shot": 4.071428571428571, "tsb": 4.142857142857143, "ses": 5.0, "croston": 5.642857142857143, "global_gbm": 7.571428571428571, "two_stage_trees": 8.357142857142858} | 3.2106 | {"chronos_fine_tuned": -0.3653220836418817, "chronos_zero_shot": -0.34941220387323013, "croston": -0.2871603278209097, "global_gbm": -0.14981537125487848, "naive": -0.4513398942745888, "sba": -0.3848114647499306, "ses": -0.3420247153802283, "tsb": -0.3419835025967399, "two_stage_trees": -0.06915523436873255} |
| break | total | sku | 1 | 726.3345 | 1.528e-151 | 224 | 9 | {"chronos_fine_tuned": 3.03125, "naive": 3.2723214285714284, "chronos_zero_shot": 3.5044642857142856, "tsb": 3.9598214285714284, "ses": 5.236607142857143, "global_gbm": 5.348214285714286, "two_stage_trees": 5.40625, "sba": 7.444196428571429, "croston": 7.796875} | 0.8026 | {"chronos_fine_tuned": -0.9001265598365196, "chronos_zero_shot": -0.9045530586684298, "croston": -0.2983999411812822, "global_gbm": -0.7455233267173541, "naive": -0.8955722639933166, "sba": -0.40103419118056555, "ses": -0.767227809999306, "tsb": -0.8710499599045805, "two_stage_trees": -0.6631277816244256} |
| break | total | sku | 4 | 637.8814 | 1.671e-132 | 221 | 9 | {"naive": 3.009049773755656, "chronos_fine_tuned": 3.248868778280543, "chronos_zero_shot": 3.755656108597285, "tsb": 4.144796380090498, "two_stage_trees": 5.298642533936651, "global_gbm": 5.3031674208144794, "ses": 5.334841628959276, "sba": 7.368778280542986, "croston": 7.536199095022624} | 0.8081 | {"chronos_fine_tuned": -0.8987705940690174, "chronos_zero_shot": -0.8886365722338888, "croston": -0.3080089473694403, "global_gbm": -0.7216144934512465, "naive": -0.9155844155844156, "sba": -0.3869764179414362, "ses": -0.7532788291153376, "tsb": -0.879170711823742, "two_stage_trees": -0.66782062969168} |
| truncated | total | category | 1 | 32.1905 | 8.61e-05 | 14 | 9 | {"two_stage_trees": 2.5714285714285716, "global_gbm": 2.7857142857142856, "chronos_fine_tuned": 5.0, "tsb": 5.0, "sba": 5.214285714285714, "croston": 5.428571428571429, "naive": 5.785714285714286, "chronos_zero_shot": 6.142857142857143, "ses": 7.071428571428571} | 3.2106 | {"chronos_fine_tuned": 0.1341332794414396, "chronos_zero_shot": 0.12632140797407854, "croston": 0.11463283730885032, "global_gbm": 0.029773180239996533, "naive": 0.1125902975659433, "sba": 0.11262006720176942, "ses": 0.14125842539012967, "tsb": 0.11262257141388332, "two_stage_trees": -0.0016253021360046471} |
| truncated | total | category | 4 | 27.8857 | 0.0005 | 14 | 9 | {"two_stage_trees": 2.642857142857143, "global_gbm": 3.0714285714285716, "chronos_zero_shot": 4.5, "chronos_fine_tuned": 5.285714285714286, "naive": 5.285714285714286, "tsb": 5.357142857142857, "sba": 6.0, "croston": 6.285714285714286, "ses": 6.571428571428571} | 3.2106 | {"chronos_fine_tuned": 0.07355394010643679, "chronos_zero_shot": 0.03370525849437289, "croston": 0.09590117365190243, "global_gbm": -0.006264761056556378, "naive": 0.09724808490198578, "sba": 0.09725875791555372, "ses": 0.10685047255804225, "tsb": 0.09723858095445159, "two_stage_trees": -0.012843826097934607} |
| truncated | total | sku | 1 | 396.6101 | 9.946e-81 | 313 | 9 | {"global_gbm": 3.3993610223642174, "ses": 3.6549520766773163, "naive": 4.830670926517572, "tsb": 4.856230031948882, "chronos_zero_shot": 4.907348242811501, "two_stage_trees": 4.977635782747604, "chronos_fine_tuned": 5.281150159744409, "sba": 6.225239616613418, "croston": 6.86741214057508} | 0.6790 | {"chronos_fine_tuned": -0.07219479479929969, "chronos_zero_shot": -0.0463347506933347, "croston": 0.10620809435211176, "global_gbm": -0.18390032274562607, "naive": -0.07144126532788331, "sba": 0.023856305706355885, "ses": -0.1207339921214079, "tsb": -0.07433274345855378, "two_stage_trees": -0.030323695839137077} |
| truncated | total | sku | 4 | 458.5147 | 5.537e-94 | 312 | 9 | {"global_gbm": 3.5, "ses": 3.610576923076923, "chronos_zero_shot": 4.663461538461538, "naive": 4.722756410256411, "two_stage_trees": 4.82051282051282, "tsb": 4.875, "chronos_fine_tuned": 5.259615384615385, "sba": 6.431089743589744, "croston": 7.11698717948718} | 0.6801 | {"chronos_fine_tuned": -0.11956099526696035, "chronos_zero_shot": -0.10714189454556744, "croston": 0.1035155924821417, "global_gbm": -0.20256743317637377, "naive": -0.09438475442341782, "sba": 0.03063800965971053, "ses": -0.15699668540648276, "tsb": -0.09293493711334117, "two_stage_trees": -0.043570220639841895} |
| expanding | total | category | 1 | 11.2381 | 0.1886 | 14 | 9 | {"chronos_zero_shot": 3.7142857142857144, "ses": 4.142857142857143, "naive": 4.285714285714286, "chronos_fine_tuned": 4.785714285714286, "tsb": 4.857142857142857, "sba": 5.214285714285714, "croston": 5.928571428571429, "global_gbm": 6.0, "two_stage_trees": 6.071428571428571} | 3.2106 | {"chronos_fine_tuned": -0.04066682061294985, "chronos_zero_shot": -0.03429883881364493, "croston": -0.025415330671730352, "global_gbm": -0.0043717844897600555, "naive": -0.025490644658274497, "sba": -0.02548677151887524, "ses": -0.011294986838213672, "tsb": -0.025487873286242024, "two_stage_trees": 0.07749929737269212} |
| expanding | total | category | 4 | 8.4000 | 0.3954 | 14 | 9 | {"chronos_zero_shot": 3.857142857142857, "chronos_fine_tuned": 4.428571428571429, "ses": 4.428571428571429, "croston": 4.714285714285714, "naive": 4.928571428571429, "tsb": 5.142857142857143, "sba": 5.357142857142857, "global_gbm": 6.0, "two_stage_trees": 6.142857142857143} | 3.2106 | {"chronos_fine_tuned": -0.0521975212753526, "chronos_zero_shot": -0.002470726747450802, "croston": -0.013799618660647772, "global_gbm": -0.002148189918943333, "naive": -0.01277167594800599, "sba": -0.012768484445303319, "ses": -0.01388995936685733, "tsb": -0.012767338598899836, "two_stage_trees": 0.09751471883129093} |
| expanding | total | sku | 1 | 824.6530 | 9.991e-173 | 313 | 9 | {"croston": 2.0175718849840254, "sba": 2.7108626198083066, "tsb": 4.987220447284345, "chronos_zero_shot": 5.412140575079873, "naive": 5.5095846645367414, "two_stage_trees": 5.763578274760383, "global_gbm": 5.795527156549521, "ses": 6.289137380191693, "chronos_fine_tuned": 6.514376996805112} | 0.6790 | {"chronos_fine_tuned": 0.37347377743521015, "chronos_zero_shot": 0.3370637930499025, "croston": -0.010401872644252408, "global_gbm": 0.3554878257528127, "naive": 0.3457528010027686, "sba": 0.11865178127241971, "ses": 0.37663072053235824, "tsb": 0.3457527996496037, "two_stage_trees": 0.31021166006569345} |
| expanding | total | sku | 4 | 791.1906 | 1.629e-165 | 312 | 9 | {"croston": 2.043269230769231, "sba": 2.6810897435897436, "tsb": 5.136217948717949, "chronos_zero_shot": 5.435897435897436, "naive": 5.706730769230769, "global_gbm": 5.766025641025641, "chronos_fine_tuned": 5.858974358974359, "two_stage_trees": 6.0673076923076925, "ses": 6.30448717948718} | 0.6801 | {"chronos_fine_tuned": 0.3879410503695886, "chronos_zero_shot": 0.33559483738578, "croston": 0.007947545267786515, "global_gbm": 0.35662438963407295, "naive": 0.36675066330239003, "sba": 0.1353415489328207, "ses": 0.38250197909253547, "tsb": 0.3589012277246024, "two_stage_trees": 0.3194605772063396} |
