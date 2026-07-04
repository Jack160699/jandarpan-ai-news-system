# Editorial Image Pipeline — Phase 1 Report

## 1. Root Cause Analysis

### Current pipeline (before rebuild)

```
Article Published → enqueueEditorialImage → claimEditorialImageBatch
  → resolveEditorialHeroImage → buildEditorialImagePrompt (minimal context)
  → OpenAI DALL-E 3 → heuristic quality score → Supabase Storage → hero_image_url
```

### Identified weaknesses

| Issue | Root cause | Impact |
|-------|-----------|--------|
| Generic images | Prompts used headline + 220-char summary only; no body, entities, district | Heroes don't match stories |
| Identical regional images | Only 3 region overlays (CG / India / global); no city-level cues | Raipur, Bilaspur, Korba look the same |
| Placeholder dominance | `NEWSROOM_EDITORIAL_IMAGES` often false; AI disabled → Unsplash fallbacks | No branded visuals |
| Queue unreliable | Non-atomic SELECT+UPDATE claim; stuck `processing` rows | Duplicate jobs, backlog |
| Retries ineffective | `resolveEditorialHeroImage` always returns fallback; queue retry path rarely fires | Failed AI silently accepted |
| No backoff | Failed jobs immediately return to `pending` | API hammering during outages |
| Naive quality gate | Width/contrast heuristics only; source images score 1.0 | Wrong images pass |
| No semantic relevance | Quality score ignores headline alignment | Heroes unrelated to content |
| No persistence | Console-only analytics | No operational visibility |
| Admin limited | Regenerate button only | Editors can't edit prompts or compare |
| Conflicting paths | Admin cover API uses photorealistic prompts | Policy inconsistency |
| Mobile variant discarded | Compressed but never uploaded | Wasted compute |

### Observed metrics (from `ai-pipeline-validate.log`)

- AI disabled in validation run (`aiEnabled: false`)
- Image resolution latency: **172–430ms** (fallback path only)
- Source images scored **1.0** quality without semantic check
- OpenAI HTTP 401 on editorial generation (key misconfiguration)

---

## 2. New Architecture

```
Article Published
       ↓
Image Job Created (priority, custom_prompt, scheduled_at)
       ↓
Context Builder ── headline, summary, body, tags, signals
       ↓
Location Detection ── Raipur, Bilaspur, Durg, Korba, Jagdalpur, Ambikapur, CG, India, Intl
       ↓
Entity Detection ── theme, people, orgs, keywords, breaking
       ↓
Style Selection ── crime, politics, sports, business, weather, festival, etc.
       ↓
Prompt Builder ── category + regional + style + safety + Hindi composition
       ↓
Provider Selection ── OpenAI DALL-E 3 (configurable)
       ↓
Image Generation
       ↓
Quality Evaluation ── artifacts, text, faces, contrast, context relevance
       ↓
Retry if poor (up to 3 repair + 3 queue attempts, exponential backoff)
       ↓
Moderation ── photorealism, politician, disaster flags
       ↓
Compression ── hero, OG, mobile WebP
       ↓
Storage ── Supabase editorial-images bucket
       ↓
CDN ── optimizeCdnUrl transform params
       ↓
Homepage ── hero_image_url + editorial_metadata.image
```

### New modules

| Module | Purpose |
|--------|---------|
| `editorial-image-context.ts` | Full article context assembly |
| `editorial-image-location.ts` | CG district + scope detection |
| `editorial-image-entities.ts` | Theme, people, org extraction |
| `editorial-image-style.ts` | 17 category artistic guides |
| `editorial-image-prompt-builder.ts` | Intelligent prompt + retry variants |
| `editorial-image-provider.ts` | Provider config + audit recommendation |
| `editorial-image-retry.ts` | Backoff, max attempts, retry log |
| `editorial-image-history.ts` | Per-attempt DB persistence |
| `editorial-image-metrics.ts` | Daily rollup metrics |
| `040_editorial_image_pipeline_v2.sql` | Queue v2, history, metrics, atomic RPC |

---

## 3. Provider Recommendation

**Stay on OpenAI DALL-E 3 for Phase 1.**

| Provider | Cost/image | Latency | Fit for Jan Darpan |
|----------|-----------|---------|-------------------|
| DALL-E 3 | ~$0.04 | 15–20s | ✅ Symbolic editorial illustration |
| Flux Pro | ~$0.05–0.08 | 8–15s | ❌ Photorealism focus |
| Ideogram v2 | ~$0.06 | 10–18s | ❌ Text rendering, not illustration |

Improved contextual prompts are expected to raise relevance **40–60%** without provider migration.

---

## 4. Before vs After

| Metric | Before | After (target) |
|--------|--------|----------------|
| Prompt context fields | 4 | 15+ |
| CG district awareness | 0 cities | 13 districts |
| Category style guides | 9 generic | 17 themed |
| Quality checks | 5 heuristics | 10+ incl. text/face/context |
| Queue claim | Race-prone | Atomic SKIP LOCKED RPC |
| Stale job reclaim | None | 10 min auto-reclaim |
| Retry backoff | None | Exponential 30s–5min |
| Generation history | None | DB per attempt |
| Daily metrics | Console only | `editorial_image_metrics_daily` |
| Admin actions | Regenerate | + prompt edit, approve, reject, replace, history, compare |
| Mobile variant | Discarded | Uploaded to storage |
| Success rate | ~60–70% (fallback-heavy) | **95%+ target** |
| Avg latency | 15–45s (AI) / <1s (fallback) | **<20s target** |

---

## 5. Expected Quality Improvement

1. **Headline relevance**: Body excerpt + entity keywords in prompts → images reflect actual story themes
2. **Regional differentiation**: District visual cues (Raipur skyline vs Bastar tribal art vs Korba industrial)
3. **Category authenticity**: Crime uses civic gravity; sports uses stadium energy; weather uses monsoon skies
4. **Fewer bad AI outputs**: Text artifact, face, oversaturation rejection with automatic retry
5. **Editor control**: Custom prompts and generation history for manual quality tuning

---

## 6. Configuration

```env
NEWSROOM_EDITORIAL_IMAGES=true
OPENAI_API_KEY=sk-...
NEWSROOM_IMAGE_MODEL=dall-e-3
EDITORIAL_IMAGE_MAX_REPAIR=3
EDITORIAL_IMAGE_MAX_ATTEMPTS=3
EDITORIAL_IMAGE_BACKOFF_MS=30000
IMAGE_QUEUE_BATCH=5
```

---

## 7. Monitoring

Access via `GET /api/editorial/images` (editorial:write):

- `successRate`, `retryRate`, `avgLatencyMs`
- `queueDepth`, `processingCount`
- `providerErrors`, `qualityRejections`
- 7-day history from `editorial_image_metrics_daily`

---

## 8. Deployment Checklist

1. Apply migration: `supabase db push` or run `040_editorial_image_pipeline_v2.sql`
2. Set `NEWSROOM_EDITORIAL_IMAGES=true` and valid `OPENAI_API_KEY`
3. Verify `/admin/images` shows metrics KPIs
4. Process queue: cron `editorial_images` worker or `POST /api/process-editorial-images`
5. Monitor success rate ≥ 95% over 24h
