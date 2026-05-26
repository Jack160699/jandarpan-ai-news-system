# Jan Darpan AI News Intelligence Engine

## Overview

The intelligence engine powers `/admin/intelligence` (Intelligence Center). It ingests `news_signals`, analyzes `generated_articles` and `news_events`, and returns a unified snapshot via `GET /api/editorial/intelligence`.

**Worker mode (recommended):** embeddings, clustering, and full snapshots run in background workers; the API serves precomputed data from Redis + `intelligence_snapshots`. See [WORKER_ARCHITECTURE.md](./WORKER_ARCHITECTURE.md).

## AI pipeline

```
Ingestion (news_signals)
    → batchEmbedSignals (OpenAI text-embedding-3-small)
    → pgvector store (intelligence_embeddings)
    → analyzeLiveSignals (misinfo, sentiment, political, breaking probability)
    → syncReputationFromIngestion (source_reputation_memory)

Articles + Events
    → headline duplicate clusters (lexical)
    → vector similarity (findSimilarByText vs signals)
    → semantic cluster (union-find on embeddings)
    → fake-news risk, trust, viral, SEO, breaking detectors
    → district heatmap + risk alerts
    → trend acceleration + forecasts
    → fact-check suggestions + AI recommendations

Snapshot (buildNewsroomIntelligenceSnapshot)
    → IntelligenceCenterPanel (20s poll)
```

Optional LLM paths (when `OPENAI_API_KEY` is set):

- `buildAiSummaryOptional` — chat completions for desk summaries
- Multilingual pipeline — translation status on articles

## Vector architecture

| Layer | Technology |
|-------|------------|
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| Storage | `intelligence_embeddings` (pgvector + `embedding_json` fallback) |
| Search | RPC `match_intelligence_embeddings` (cosine via `<=>`) |
| Clustering | In-process union-find on embedding cosine similarity (threshold 0.82) |
| Entities | `signal`, `article`, `event` |

Migration: `supabase/migrations/028_intelligence_vectors.sql`

If pgvector RPC fails, the store falls back to loading `embedding_json` and scoring in Node.

## Scaling approach

1. **Tenant scoping** — all queries filter by `tenant_id` where applicable.
2. **Bounded work per request** — embed max 25 signals, cluster max 20, vector duplicate checks on top 8 articles.
3. **IVFFlat index** — `idx_intelligence_embeddings_vector` for approximate NN at scale.
4. **Async reputation sync** — fire-and-forget `syncReputationFromIngestion` to avoid blocking snapshot.
5. **Horizontal scaling** — move embedding batch to a cron/worker after ingest (`scalable-ingest` hook); snapshot API stays read-mostly.
6. **Caching** — add Redis snapshot cache keyed by `tenantId` with 30–60s TTL for high-traffic desks.
7. **Rate limits** — batch OpenAI embed calls; consider embedding cache via `content_hash` skip on upsert.

## Dashboard modules

- **Intelligence Center** — terminal KPIs + tabs: live feed, source graph, event graph, confidence heatmap
- **Rails** — recommendations, district alerts, fact-check queue, misinfo/political watch, ingestion stats

## RBAC

`analytics:read` on `AdminPageGate` for the intelligence page and GET API.
