# F3 internal validation summary

Development span only; the final test is sealed. Leaderboards rank models within each series by MASE (horizon 1 and the longest horizon).

## weekly - horizon 1 (run `20261021T223133Z-weekly-validation`)

| level | model | series | median_mase | median_rmsse | mean_bias | mean_rank | share_beats_naive |
|---|---|---|---|---|---|---|---|
| category | ses | 14 | 0.7755 | 0.7805 | 0.2299 | 2.5 | 0.7857 |
| category | tsb | 14 | 0.7907 | 0.7646 | 0.5392 | 2.5 | 0.5 |
| category | sba | 14 | 0.7957 | 0.778 | 0.4642 | 2.5714 | 0.5 |
| category | naive | 14 | 0.7893 | 0.8793 | 0.0786 | 3.2857 | 0.0 |
| category | croston | 14 | 0.8079 | 0.7796 | 0.6095 | 4.1429 | 0.5 |
| sku | naive | 300 | 0.4683 | 0.6827 | 0.0033 | 1.79 | 0.0 |
| sku | ses | 300 | 0.5783 | 0.5067 | 0.0163 | 2.6867 | 0.21 |
| sku | tsb | 300 | 0.661 | 0.5033 | 0.0223 | 2.7033 | 0.21 |
| sku | sba | 300 | 1.7592 | 0.9808 | 0.1609 | 3.4033 | 0.19 |
| sku | croston | 300 | 1.8233 | 0.9991 | 0.1736 | 4.4167 | 0.18 |
| total | naive | 1 | 0.8867 | 0.8992 | 1.1 | 1.0 | 0.0 |
| total | ses | 1 | 0.9068 | 0.8722 | 1.5375 | 2.0 | 0.0 |
| total | sba | 1 | 1.0543 | 1.0042 | 5.2242 | 3.0 | 0.0 |
| total | tsb | 1 | 1.107 | 1.0401 | 7.1303 | 4.0 | 0.0 |
| total | croston | 1 | 1.1072 | 1.04 | 7.1913 | 5.0 | 0.0 |

## weekly - horizon 4 (run `20261021T223133Z-weekly-validation`)

| level | model | series | median_mase | median_rmsse | mean_bias | mean_rank | share_beats_naive |
|---|---|---|---|---|---|---|---|
| category | ses | 14 | 0.8299 | 0.8008 | 0.3875 | 2.2143 | 0.8571 |
| category | sba | 14 | 0.8327 | 0.8057 | 0.629 | 2.4286 | 0.6429 |
| category | tsb | 14 | 0.8326 | 0.7954 | 0.7094 | 2.5714 | 0.7143 |
| category | naive | 14 | 1.0015 | 1.0302 | 0.2381 | 3.7857 | 0.0 |
| category | croston | 14 | 0.851 | 0.8096 | 0.7782 | 4.0 | 0.5714 |
| sku | naive | 300 | 0.4744 | 0.6888 | 0.0103 | 1.9866 | 0.0 |
| sku | tsb | 300 | 0.647 | 0.4954 | 0.0301 | 2.7291 | 0.2567 |
| sku | ses | 300 | 0.5617 | 0.4874 | 0.0237 | 2.7525 | 0.24 |
| sku | sba | 300 | 1.6986 | 0.978 | 0.1666 | 3.2609 | 0.2433 |
| sku | croston | 300 | 1.7512 | 1.009 | 0.1794 | 4.2709 | 0.2433 |
| total | ses | 1 | 1.2337 | 1.1962 | 3.7356 | 1.0 | 1.0 |
| total | sba | 1 | 1.247 | 1.1737 | 7.5658 | 2.0 | 1.0 |
| total | tsb | 1 | 1.3214 | 1.2231 | 9.5208 | 3.0 | 1.0 |
| total | croston | 1 | 1.3215 | 1.2227 | 9.5901 | 4.0 | 1.0 |
| total | naive | 1 | 1.368 | 1.2956 | 3.3333 | 5.0 | 0.0 |

## monthly - horizon 1 (run `20261021T223137Z-monthly-validation`)

| level | model | series | median_mase | median_rmsse | mean_bias | mean_rank | share_beats_naive |
|---|---|---|---|---|---|---|---|
| category | ses | 14 | 0.7609 | 0.6687 | 1.6202 | 2.0 | 0.4286 |
| category | naive | 14 | 0.62 | 0.5697 | 0.4464 | 2.0714 | 0.0 |
| category | sba | 14 | 1.0873 | 0.9254 | 7.4063 | 2.8571 | 0.2143 |
| category | tsb | 14 | 1.0756 | 0.977 | 8.0548 | 3.8929 | 0.2143 |
| category | croston | 14 | 1.1438 | 0.9728 | 8.0917 | 4.1786 | 0.2143 |
| sku | naive | 300 | 0.0 | 0.0 | 0.0233 | 1.5953 | 0.0 |
| sku | ses | 300 | 0.2765 | 0.1387 | 0.1181 | 2.6321 | 0.1267 |
| sku | sba | 300 | 1.566 | 0.9383 | 0.8342 | 3.2508 | 0.1667 |
| sku | tsb | 300 | 0.6537 | 0.353 | 0.3251 | 3.3177 | 0.1367 |
| sku | croston | 300 | 1.6258 | 0.9714 | 0.8865 | 4.204 | 0.1633 |
| total | naive | 1 | 0.5078 | 0.4264 | 6.25 | 1.0 | 0.0 |
| total | ses | 1 | 0.5856 | 0.4939 | 10.7388 | 2.0 | 0.0 |
| total | sba | 1 | 1.7362 | 1.4346 | 102.5618 | 3.0 | 0.0 |
| total | croston | 1 | 1.8976 | 1.5624 | 112.0979 | 4.5 | 0.0 |
| total | tsb | 1 | 1.8976 | 1.5624 | 112.0979 | 4.5 | 0.0 |
