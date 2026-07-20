# Human Quality Score

Weights (sum 100):

| Component | Weight |
|-----------|-------:|
| factualGrounding | 25 |
| districtRelevance | 20 |
| readability | 15 |
| sourceDiversity | 15 |
| freshness | 10 |
| imagePresence | 10 |
| headlineClarity | 5 |

## Thresholds (stage 1)

| Band | Score |
|------|------:|
| publish | ≥ 82 |
| repair | 70–81 |
| hold | &lt; 70 |
| highRisk flag | ≥ 90 |

Helpers: `scoreHumanQuality`, `decideQualityGate`, `meetsPublishThreshold`.

Inputs are 0–1 component scores; output is integer 0–100.
