import sys
content = open('src/lib/news/live-feed/resolve-pool.ts').read()

old_str = '''  if (dbRows.length >= AGGREGATION_CONFIG.dbCriticalThreshold) {
    diagnostics.ingestFirstSkippedWire = true;
    warnLiveFeed("db_sparse_ingest_first", {
      dbCount: dbRows.length,
      threshold: AGGREGATION_CONFIG.dbHealthyThreshold,
    });
    const result = finalizePool(dbRows, "database", diagnostics);
    flushAggregationMetrics();
    return result;
  }

  let wireRows: GeneratedArticleRow[] = [];
  try {
    const wire = await getWireArticlesCached(Math.min(limit, 80));
    diagnostics.rateLimited = wire.rateLimited;
    diagnostics.errors.push(...wire.errors);
    diagnostics.providersAttempted = wire.providersAttempted;
    wireRows = wireArticlesToGeneratedPool(wire.articles, limit);
    diagnostics.wireCount = wireRows.length;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "wire_fetch_failed";
    diagnostics.errors.push(msg);
    errorLiveFeed("wire_pool_failed", { error: msg });
  }

  if (wireRows.length > 0) {
    const merged = mergePools(dbRows, wireRows);
    const result = finalizePool(
      merged.slice(0, limit),
      dbRows.length > 0 ? "mixed" : "wire_api",
      diagnostics
    );
    flushAggregationMetrics();
    return result;
  }'''

new_str = '''  // Always rely on the database for live feed, do not fallback to wire
  // which consumes quotas during live traffic.
  if (dbRows.length > 0 || diagnostics.supabaseConfigured) {
    diagnostics.ingestFirstSkippedWire = true;
    if (dbRows.length < AGGREGATION_CONFIG.dbHealthyThreshold) {
      warnLiveFeed("db_sparse_ingest_first", {
        dbCount: dbRows.length,
        threshold: AGGREGATION_CONFIG.dbHealthyThreshold,
      });
    }
    const result = finalizePool(dbRows, "database", diagnostics);
    flushAggregationMetrics();
    return result;
  }'''

content = content.replace(old_str, new_str)
open('src/lib/news/live-feed/resolve-pool.ts', 'w').write(content)
