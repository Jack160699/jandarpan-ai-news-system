# Phase 4 — Checkpoint

## Status: COMPLETE (local only — not pushed, not deployed)

## Scope delivered

1. ✅ Fixed translation urgency wiring (`resolveTranslationUrgencyScore` + handler event join)
2. ✅ Legacy payload normalization + standardized job contract / content version
3. ✅ Hindi/English default policy; CG gated by `NEWSROOM_CG_TRANSLATION=true`
4. ✅ Safe translation recovery CLI (dry-run default)
5. ✅ Coverage metrics excluding disabled CG from active backlog
6. ✅ Tests + typecheck/lint/build verification
7. ✅ Docs: root cause, policy, recovery, checkpoint

## Key paths

- `src/lib/i18n/multilingual/translation-contract.ts`
- `src/lib/i18n/multilingual/translate.ts`
- `src/lib/i18n/multilingual/translation-queue.ts`
- `src/lib/infrastructure/jobs/handlers.ts` (`translateArticle`)
- `src/lib/ops/translation-recovery.ts`
- `scripts/translation-recovery.ts`

## Explicit non-actions

- No production `--execute` translation retries
- No push / deploy

## Environment

- Branch: `main`
- Parent: Phase 3 `c730b92`

## Ready for Phase 5.
