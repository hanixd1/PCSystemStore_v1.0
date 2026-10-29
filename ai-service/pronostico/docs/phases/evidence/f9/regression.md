# F9 regression: development runs with the final-test harness

- Date: 2026-10-26
- Method: the internal validation and the inventory simulation of both frequencies were rerun with the F9 code in a scratch project root (same configs, data and pinned weights) and compared with the runs of 2026-10-26 used for the freeze (`pcs compare-runs`; inventory rows compared with pandas `equals`).
- Reference runs: `20261026T041019Z-weekly-validation`, `20261026T045600Z-monthly-validation`, `20261026T043607Z-weekly-inventory`, `20261026T045106Z-monthly-inventory`.

```text
chronos_fine_tuned   forecasts=202176  identical=202176  only_in_one=0  max_abs_diff=0
chronos_zero_shot    forecasts=202176  identical=202176  only_in_one=0  max_abs_diff=0
croston              forecasts=202176  identical=202176  only_in_one=0  max_abs_diff=0
global_gbm           forecasts=202176  identical=202176  only_in_one=0  max_abs_diff=0
naive                forecasts=202176  identical=202176  only_in_one=0  max_abs_diff=0
sba                  forecasts=202176  identical=202176  only_in_one=0  max_abs_diff=0
ses                  forecasts=202176  identical=202176  only_in_one=0  max_abs_diff=0
tsb                  forecasts=202176  identical=202176  only_in_one=0  max_abs_diff=0
two_stage_trees      forecasts=202176  identical=202176  only_in_one=0  max_abs_diff=0
chronos_fine_tuned   forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
chronos_zero_shot    forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
croston              forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
global_gbm           forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
naive                forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
sba                  forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
ses                  forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
tsb                  forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
two_stage_trees      forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
weekly inventory identical: True 62208 62208
monthly inventory identical: True 62208 62208
```

After the final refactor (shared `evaluated_panel`, SonarQube S3776), the monthly validation and
inventory were rerun once more and compared with the same reference runs:

```text
chronos_fine_tuned   forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
chronos_zero_shot    forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
croston              forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
global_gbm           forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
naive                forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
sba                  forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
ses                  forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
tsb                  forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
two_stage_trees      forecasts=24192  identical=24192  only_in_one=0  max_abs_diff=0
inventory identical: True
```
