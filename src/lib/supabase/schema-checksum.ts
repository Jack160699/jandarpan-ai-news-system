/**
 * Expected checksum for critical tables (post migration 034).
 * Update after intentional schema changes: npm run schema:checksum
 */

export const CRITICAL_SCHEMA_CHECKSUM_V1 = "8ef22387599b0312662be43394a78f30";

export const CRITICAL_SCHEMA_TABLES = [
  "tenant_memberships",
  "newsroom_tenants",
  "generated_articles",
  "editorial_workflow_events",
  "intelligence_embeddings",
  "dam_assets",
  "newsroom_editor_locks",
  "reader_analytics_events",
  "ingestion_logs",
  "ingestion_failures",
  "rss_source_health",
] as const;
