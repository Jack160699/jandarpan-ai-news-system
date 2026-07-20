# Translation Flow

## End-to-end path

1. **Article creation** — `generate-article` / editorial-generate writes `generated_articles`
2. **Source language** — `normalizeArticleLanguage(row.language)` → canonical `hi` / `en` / `cg`
3. **Requirement decision** — `articleNeedsTranslation(row, target)` + `isActiveReaderTarget`
4. **Job creation** — `enqueueArticleTranslation` → `worker_jobs` with `job_type=translate_article`
5. **Idempotency** — `dedupe_key = translate:{articleId}:{target}` (content version checked at execute)
6. **Queue** — `worker_jobs` table
7. **Scheduler** — Vercel cron `GET/POST /api/cron/translation-backfill` (`10,40 * * * *` after fix)
8. **Atomic claim** — `processJobBatch` with `jobTypes: ["translate_article","translation_batch"]`
9. **Load article** — select generated article + workflow/editorial fields
10. **Provider** — `translateGeneratedArticle` (OpenAI when key present)
11. **Validation** — non-empty headline/summary/body checks in translate path
12. **Persistence** — translations column / editorial_metadata bundle with `source_content_version`
13. **Relationship** — same article row, locale bundle under target language key
14. **Completion** — job status `completed` after persistence
15. **Retry / quarantine** — retryable errors retry; CG disabled → quarantined; permanent → dead
16. **Availability** — reader resolves via `getArticleTranslations` / `resolveLocalizedFieldsStrict`

## Operational contract

| Item | Value |
|---|---|
| Queue table | `worker_jobs` |
| Job types | `translate_article`, `translation_batch` |
| Worker entry | `/api/cron/translation-backfill` (+ shared job_processor) |
| Batch size | default process **12**, enqueue **40** |
| Runtime | `maxDuration = 300` |
| Claim | atomic claim in `processJobBatch` |
| Priority default | **9** (above intelligence starvation band) |
| CG gate | `NEWSROOM_CG_TRANSLATION=true` only |
| Process escape hatch | `TRANSLATION_BACKFILL_ENQUEUE_ONLY=true` |

## Publication linkage

Translations attach to the **same** `generated_articles` row. Publishing does not require a separate translated article ID. Eligibility now includes scheduled/pending/approved workflow states so Step 1 yield stories can translate before `published_at` is set.
