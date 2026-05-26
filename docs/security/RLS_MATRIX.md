# RLS Matrix — Jan Darpan OS

**Legend:** ✅ Allowed | ❌ Denied | 🔒 Service role only | 🌐 Public (scoped)

| Table | RLS | anon | authenticated | service_role | Tenant filter | Notes |
|-------|-----|------|---------------|--------------|---------------|-------|
| **news_articles** | ✅ | 🌐 SELECT all | 🌐 SELECT all | ALL | None | Global news ingest |
| **generated_articles** | ✅ | 🌐 published only | 🌐 published only | ALL | App filter | **033** hardens |
| **coverage_updates** | ✅ | 🌐 SELECT all | 🌐 SELECT all | ALL | None | |
| **news_events** | ✅ | 🌐 `is_live` | 🌐 `is_live` | ALL | None | |
| **newsroom_tenants** | ✅ | 🌐 active | 🌐 active | ALL | status | Domain routing |
| **tenant_memberships** | ✅ | ❌ | SELECT own + super_admin tenant | ALL | **033** helpers | Only tenant-aware client RLS |
| **monetization_placements** | ✅ | ❌ | ❌ | ALL | App `tenant_id` | **033** removed public read |
| **sponsored_stories** | ✅ | ❌ | ❌ | ALL | App | **033** |
| **reader_plans** | ✅ | ❌ | ❌ | ALL | App | **033** |
| **premium_reports** | ✅ | ❌ | ❌ | ALL | App | **033** |
| **newsletters** | ✅ | ❌ | ❌ | ALL | App | **033** |
| **affiliate_placements** | ✅ | ❌ | ❌ | ALL | App | **033** |
| **reader_subscriptions** | ✅ | ❌ | ❌ | ALL | — | PII |
| **newsletter_subscribers** | ✅ | ❌ | ❌ | ALL | — | PII |
| **monetization_events** | ✅ | ❌ | ❌ | ALL | — | |
| **tenant_billing** | ✅ | ❌ | ❌ | ALL | — | |
| **tenant_api_requests** | ✅ | ❌ | ❌ | ALL | — | |
| **editorial_audit_log** | ✅ | ❌ | ❌ | ALL | — | |
| **reader_analytics_events** | ✅ | ❌ | ❌ | ALL | — | |
| **article_metrics_daily** | ✅ | ❌ | ❌ | ALL | — | |
| **breaking_velocity_snapshots** | ✅ | ❌ | ❌ | ALL | — | |
| **ingestion_*** / **news_ai_queue** | ✅ | ❌ | ❌ | ALL | — | Pipeline |
| **editorial_workflow_*** | ✅ | ❌ | ❌ | ALL | App | |
| **intelligence_embeddings** | ✅ | ❌ | ❌ | ALL | RPC filter | |
| **dam_*** | ✅ | ❌ | ❌ | ALL | App | |
| **newsroom_collaboration_*** | ✅ | ❌ | ❌ | ALL | App | |
| **analytics_report_schedules** | ✅ | ❌ | ❌ | ALL | App | |
| **platform_articles** | ✅ | 🌐 SELECT | 🌐 SELECT | ALL | — | **033** explicit roles |
| **platform_districts/topics/breaking** | ✅ | 🌐 enabled/active | 🌐 | ALL | — | |
| **platform_article_sources** | ✅ | ❌ | ❌ | — | Deny all clients | **033** service policy |
| **platform_ai_logs** | ✅ | ❌ | ❌ | — | Deny all clients | **033** service policy |
| **security_sessions** | ✅ | ❌ | ❌ | ALL | — | **033** new |
| **security_devices** | ✅ | ❌ | ❌ | ALL | — | **033** new |
| **security_login_events** | ✅ | ❌ | ❌ | ALL | — | **033** new |
| **security_audit_events** | ✅ | ❌ | ❌ | ALL | — | **033** new |
| **security_permission_changes** | ✅ | ❌ | ❌ | ALL | — | **033** new |
| **user_two_factor** | ✅ | ❌ | SELECT own status | ALL | — | **033** new |

## RPC Functions

| Function | anon | authenticated | service_role |
|----------|------|---------------|--------------|
| `match_intelligence_embeddings` | ❌ **033** | ✅ | ✅ |
| `reload_postgrest_schema` | ❌ | ❌ | ✅ |

## Architecture Note

**Desk operations (DAM, workflow, collaboration, intelligence writes)** use the **service role** via Next.js API routes. RLS on those tables is **deny-by-default for anon/authenticated**. Tenant isolation is enforced by:

1. `requireDashboardSession(permission)` on every API route  
2. `session.membership.tenantId` in queries  
3. Service role never exposed to browser
