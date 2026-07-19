# Phase 5 — Generation Quality Contract

## Module

`src/lib/news/ai/generated-article-validation.ts`

## Validates

| Check | Codes |
|---|---|
| Non-empty / non-placeholder title | `empty_title`, `placeholder_title` |
| Minimum body length / substance | `empty_body`, `body_too_short`, `body_headings_only`, `body_urls_only` |
| Valid summary | `invalid_summary` |
| Valid language | `invalid_language` |
| Category / region | `missing_category`, `missing_region` |
| Source attribution + URLs | `missing_source_attribution`, `missing_source_urls` |
| Generation metadata | `missing_generation_metadata` |
| Duplicates | `duplicate_cluster`, `duplicate_title`, `duplicate_body`, `duplicate_source_url` |
| Template / JSON / unsafe markup | `unresolved_template_token`, `raw_json_or_instructions`, `unsafe_markup`, `empty_section` |
| Model failure text | `model_apology`, `generation_error_text` |

## Stages

- `draft` — structural title/body/language (+ category)
- `persist` / `publish` — also sources + metadata

## Placeholder titles rejected

Untitled story, Untitled, No title, Draft, Test, null, undefined, placeholder, whitespace, Hindi “बिना शीर्षक”.

## Integration

- `runEditorialQualityChecks` merges structural codes into **hard rejects**
- `forcePublish` cannot bypass structural hard rejects
- `persistGeneratedArticle` re-validates at persist stage
- `publishGeneratedArticle` final gate
