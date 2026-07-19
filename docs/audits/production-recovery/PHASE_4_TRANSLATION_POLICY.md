# Phase 4 — Translation Language Policy

## Active reader pairs (default)

| Source | Target | Default |
|---|---|---|
| Hindi (`hi`) | English (`en`) | **on** |
| English (`en`) | Hindi (`hi`) | **on** |
| Hindi (`hi`) | Chhattisgarhi (`cg`) | **off** unless enabled |

## Chhattisgarhi gate

```bash
NEWSROOM_CG_TRANSLATION=true   # required to enqueue/run hi→cg
```

- Default: **disabled**
- When disabled:
  - `getReaderTranslationPairs()` omits CG
  - `articleNeedsTranslation(..., "cg")` → false
  - `translate_article` handler skips with `language_disabled`
  - Recovery tooling excludes CG jobs from active pending / coverage denominators
  - Historical CG jobs may be quarantined as `disabled_language` (annotate, no delete)

## Auto-translate expansion

`NEWSROOM_AUTO_TRANSLATE=true` may expand targets via `NEWSROOM_TRANSLATE_LANGS`, but CG still requires `NEWSROOM_CG_TRANSLATION=true` for active reader CG work in recovery/coverage.

## Idempotency

- Dedupe key: `translate:{articleId}:{target}`
- Content version: SHA-256 prefix of headline/summary/body
- Skip execute when a complete bundle exists for the current version
- Legacy bundles without `source_content_version` count as complete until source text changes and a stamped version diverges
