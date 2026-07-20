# Human Quality Score

Weights (sum 100):

| Component | Weight |
|-----------|-------:|
| factualGrounding | 25 |
| districtRelevance | 20 |
| readability | 15 |
| sourceDiversity | 10 |
| freshness | 10 |
| imagePresence | 10 |
| headlineClarity | 10 |

## Thresholds

- `PUBLISH_THRESHOLD = 70` — autonomous publish gate
- `REVIEW_THRESHOLD = 55` — soft hold / log band

Inputs are 0–1 component scores; output is integer 0–100.
