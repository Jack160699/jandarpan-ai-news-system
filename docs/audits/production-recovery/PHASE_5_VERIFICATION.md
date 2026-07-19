# Phase 5 — Verification

## Automated tests

| Suite | Coverage |
|---|---|
| `generated-article-validation.test.ts` | empty/placeholder title, body, apology, hi/en valid, duplicates, HTML, retry/quarantine, batch metrics |
| `editorial-guards.phase5.test.ts` | forcePublish cannot bypass structural; batch hard vs soft |
| `publication.quality.test.ts` | publish gate blocks untitled empty drafts |

## Commands run

```bash
npx vitest run src/lib/news/ai/generated-article-validation.test.ts \
  src/lib/news/ai/editorial-guards.phase5.test.ts \
  src/lib/editorial/publication.quality.test.ts
npm run typecheck
npx eslint <touched files>
npm run build
```

## Metrics observed in batch output

`BatchEditorialResult.qualityMetrics`:

- passRate, titleFailure, bodyFailure, missingSource, duplicateRejection, languageFailure, retries, quarantined, manualReview
