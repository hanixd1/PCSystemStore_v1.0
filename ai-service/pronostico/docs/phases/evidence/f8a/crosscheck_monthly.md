# statsforecast cross-check - monthly

| method       |   cases |   max_abs_difference |   max_rel_difference |   cases_within_tolerance | must_match   | agrees   |
|:-------------|--------:|---------------------:|---------------------:|-------------------------:|:-------------|:---------|
| naive        |   13824 |          0           |          0           |                    13824 | True         | True     |
| croston      |   13824 |          2.27374e-13 |          1.19555e-15 |                    13824 | True         | True     |
| sba          |   13824 |          2.27374e-13 |          1.25847e-15 |                    13824 | True         | True     |
| tsb          |   13824 |          8.52651e-14 |          1.11022e-15 |                    13824 | True         | True     |
| tsb_declared |   13824 |          0.0430625   |          0.0430625   |                     2077 | False        | False    |
| ses          |   13824 |          1.13687e-13 |          1.2653e-15  |                    13824 | True         | True     |
