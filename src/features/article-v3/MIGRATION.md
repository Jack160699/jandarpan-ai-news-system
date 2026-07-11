# JDP-004 — Article Experience V3 Migration Guide

## Overview

Article Experience V3 is a complete article **presentation** redesign. It consumes the same story data layer (`getStoryArticleBySlug`, `buildStoryIntelligence`, etc.) as the production immersive story page — no backend, API, or data changes.

**Default:** OFF. Production article page is unchanged until you opt in.

---

## Activation

Set in `.env.local` or Vercel environment variables:

```bash
NEXT_PUBLIC_ARTICLE_V3=1
```

Restart the dev server after changing public env vars.

| Value | Behavior |
|-------|----------|
| unset / `0` | Legacy `ImmersiveStoryPage` (production default) |
| `1` | `ArticleExperienceV3` story flow |

---

## Architecture

```
/story/[slug]/page.tsx (unchanged server data fetch + SEO)
  └─ [V3 OFF] PageShell → ImmersiveStoryPage
  └─ [V3 ON]  PageShell → ArticleExperienceV3
```

### Component map

| Component | Role |
|-----------|------|
| `ArticleHero` | Headline, meta, hero image |
| `ReadingProgress` | Sticky scroll progress bar |
| `AISummaryCard` | AI summary callout |
| `KeyFacts` | Editorial takeaways |
| `Timeline` | Chronological events |
| `SourcesCard` | Source transparency |
| `DistrictContext` | Regional context + topics |
| `ArticleBody` | Story content with V3 typography |
| `RelatedStories` | Related article grid |
| `ContinueReading` | Continue reading + hub links |
| `ArticleFooter` | Disclaimers + metadata |
| `ReadingToolbar` | Back, save, listen, share, reading prefs |
| `FloatingShare` | Mobile floating share button |
| `SaveForLater` | Bookmark toggle |
| `ListenButton` | Text-to-speech via ArticleSpeechProvider |

---

## Rollback

Remove or set `NEXT_PUBLIC_ARTICLE_V3=0`. Legacy story page renders immediately.
