# Code Changes — Step 2 Translation Execution

## Summary

Smallest reliable fix: make `/api/cron/translation-backfill` **process** a bounded `translate_article` batch on every scheduled run; raise translation priority; broaden article eligibility; normalize language aliases.

## Files

| File | Change |
|---|---|
| `src/lib/infrastructure/cron/translation-policy.ts` | Default allow process on `scheduled_cron` / `vercel_backup`; enqueue-only via env escape hatch |
| `src/lib/infrastructure/cron/translation-policy.test.ts` | New unit tests |
| `src/app/api/cron/translation-backfill/route.ts` | Process when gate allows; `oldestFirst`; batch 12; return performance |
| `vercel.json` | Cron `10,40 * * * *` (was `20 */6 * * *`) |
| `scripts/setup-qstash-schedules.mjs` | Match schedule |
| `src/lib/i18n/multilingual/translation-contract.ts` | `isArticleEligibleForAutoTranslation`; priority default 9; alias-aware payload |
| `src/lib/i18n/multilingual/translation-contract.test.ts` | Eligibility + alias tests |
| `src/lib/infrastructure/jobs/handlers.ts` | Use eligibility; select `workflow_status` |
| `src/lib/i18n/multilingual/translation-queue.ts` | Priority 9; missing-scan includes scheduled/pending |
| `src/lib/i18n/languages.ts` | Broader alias normalization |
| `src/lib/infrastructure/cron/registered-jobs.ts` / `retired-jobs.ts` | Heartbeat / comments |

## Not changed

- Reader UI / public design
- SEO / admin redesign
- Ingestion deduplication
- Destructive migrations
- CG auto-enable

## Migration

None required (forward-only code + cron config).
