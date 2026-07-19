# Phase 4 — Translation Recovery Runbook

**Do not run `--execute` against production until Phase 4 is deployed.**

## Commands

```bash
# Coverage metrics (hi/en active; CG excluded unless enabled)
npm run ops:translation-coverage

# Dry-run recovery classification
npm run ops:translation-recovery
npx tsx scripts/translation-recovery.ts --pair=hi:en --pair=en:hi --batch-size=10

# Filter to urgencyScore failures
npx tsx scripts/translation-recovery.ts --reason=urgencyScore

# After deploy only:
npx tsx scripts/translation-recovery.ts --execute --batch-size=10 --pair=hi:en
```

## Guards

- Dry-run default
- Duplicate active job detection
- Completed translation detection
- Disabled-language (CG) exclusion / quarantine annotation
- Retryable vs permanent error classification
- Batch limit
- Audit JSON under `docs/audits/production-recovery/logs/`

## Coverage fields

- published Hindi / English
- translations required / completed / missing
- active pending (excluding disabled CG)
- failed retryable / permanent
- oldest pending
- coverage percentage

## Recommended post-deploy order

1. Deploy Phase 4 code  
2. `ops:translation-coverage` baseline  
3. Dry-run recovery  
4. Execute small batches (≤10) for `urgencyScore` / `translation_failed`  
5. Re-check coverage; do not flood OpenAI  
