# Language Policy

## Primary reader languages

- Hindi (`hi`)
- English (`en`)

## Chhattisgarhi

- Default: **disabled**
- Enable only with `NEWSROOM_CG_TRANSLATION=true`
- Existing quarantined CG jobs remain excluded from active HI/EN backlog
- Historical CG jobs must not enter active claim batches (failed/quarantined status)

## Canonical normalizer

`normalizeArticleLanguage` in `src/lib/i18n/languages.ts` maps aliases including:

- `hi`, `hi-IN`, `hindi` → `hi`
- `en`, `en-IN`, `en-US`, `english` → `en`
- legacy CG codes → `cg`

Same-language translation is rejected (`same_language` skip).

Unknown languages enter safe detection / review rather than blind translation.

## Active target gate

`isActiveReaderTarget(target)`:

- `hi` / `en` — always active
- `cg` — only when env enabled
