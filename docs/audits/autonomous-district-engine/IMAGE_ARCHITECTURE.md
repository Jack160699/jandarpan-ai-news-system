# Image Architecture

## Modules

| File | Role |
|------|------|
| `canonical-image-resolver.ts` | Single resolver → display/og/mobile + source/fallback/validation state |
| `image-url-validation.ts` | Sync https/shape checks; async HEAD/GET with injectable fetch |
| `image-quality-score.ts` | 100-point image score |
| `editorial-visual-fallbacks.ts` | Existing contextual fallbacks **preserved**; re-exports canonical resolver |

## Resolution order

1. hero (https shape ok)
2. og
3. body image
4. contextual fallback (category/region/source)
5. branded placeholder (via existing fallbacks)

Existing fallback hierarchy is not removed.
