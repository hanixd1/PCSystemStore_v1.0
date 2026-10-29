# statsforecast cross-check - weekly

| method       |   cases |   max_abs_difference |   max_rel_difference |   cases_within_tolerance | must_match   | agrees   |
|:-------------|--------:|---------------------:|---------------------:|-------------------------:|:-------------|:---------|
| naive        |   17280 |          0           |          0           |                    17280 | True         | True     |
| croston      |   17280 |          4.26326e-14 |          1.55566e-15 |                    17280 | True         | True     |
| sba          |   17280 |          4.26326e-14 |          1.50108e-15 |                    17280 | True         | True     |
| tsb          |   17280 |          5.68434e-14 |          1.06172e-15 |                    17280 | True         | True     |
| tsb_declared |   17280 |          7.37198e-08 |          7.37198e-08 |                    11550 | False        | False    |
| ses          |   17280 |          1.13687e-13 |          1.91804e-15 |                    17280 | True         | True     |
