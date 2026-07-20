/**
 * Step 3 — canonical ingestion source state (cursors, quota, retirement).
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";

type UntypedClient = {
  from: (relation: string) => {
    select: (cols?: string) => any;
    upsert: (values: unknown, opts?: unknown) => any;
    update: (values: unknown) => any;
    insert: (values: unknown) => any;
  };
};

function db(): UntypedClient {
  return createAdminServerClient() as unknown as UntypedClient;
}

export type IngestionHealthState =
  | "healthy"
  | "warning"
  | "quota_exhausted"
  | "rate_limited"
  | "temporarily_disabled"
  | "parser_broken"
  | "permanently_retired"
  | "unknown";

export type IngestionSourceStateRow = {
  id?: string;
  tenant_id: string | null;
  source_key: string;
  provider_family: string;
  enabled: boolean;
  health_state: IngestionHealthState;
  parser_type: string | null;
  last_attempted_at: string | null;
  last_successful_at: string | null;
  last_new_item_at: string | null;
  last_item_timestamp: string | null;
  cursor_token: string | null;
  etag: string | null;
  last_modified: string | null;
  consecutive_failures: number;
  consecutive_empty_runs: number;
  disabled_until: string | null;
  quota_exhausted_until: string | null;
  rate_limited_until: string | null;
  retirement_reason: string | null;
  last_error_category: string | null;
  lease_owner: string | null;
  lease_expires_at: string | null;
  metadata: Record<string, unknown>;
  updated_at?: string;
};

const memory = new Map<string, IngestionSourceStateRow>();

function memoryKey(tenantId: string | null, sourceKey: string): string {
  return `${tenantId ?? "global"}::${sourceKey}`;
}

export function buildSourceKey(
  family: string,
  id: string
): string {
  return `${family}:${id}`;
}

export function isSourceCurrentlyBlocked(
  row: IngestionSourceStateRow | null | undefined,
  now = Date.now()
): { blocked: boolean; reason: string | null } {
  if (!row) return { blocked: false, reason: null };
  if (!row.enabled || row.health_state === "permanently_retired") {
    return { blocked: true, reason: row.retirement_reason ?? "permanently_retired" };
  }
  if (row.quota_exhausted_until && new Date(row.quota_exhausted_until).getTime() > now) {
    return { blocked: true, reason: "quota_exhausted" };
  }
  if (row.rate_limited_until && new Date(row.rate_limited_until).getTime() > now) {
    return { blocked: true, reason: "rate_limited" };
  }
  if (row.disabled_until && new Date(row.disabled_until).getTime() > now) {
    return { blocked: true, reason: "temporarily_disabled" };
  }
  return { blocked: false, reason: null };
}

/** Next UTC midnight — GNews free-tier daily reset heuristic. */
export function nextUtcMidnightIso(from = new Date()): string {
  const d = new Date(Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate() + 1,
    0,
    0,
    0
  ));
  return d.toISOString();
}

export async function loadIngestionSourceState(
  sourceKey: string,
  tenantId: string | null = null
): Promise<IngestionSourceStateRow | null> {
  const mk = memoryKey(tenantId, sourceKey);
  if (!isSupabaseConfigured()) {
    return memory.get(mk) ?? null;
  }

  try {
    const supabase = db();
    let q = supabase
      .from("ingestion_source_state")
      .select("*")
      .eq("source_key", sourceKey)
      .limit(1);
    q = tenantId ? q.eq("tenant_id", tenantId) : q.is("tenant_id", null);
    const { data, error } = await q.maybeSingle();
    if (error || !data) return memory.get(mk) ?? null;
    const row = data as IngestionSourceStateRow;
    memory.set(mk, row);
    return row;
  } catch {
    return memory.get(mk) ?? null;
  }
}

export async function upsertIngestionSourceState(
  patch: Partial<IngestionSourceStateRow> & {
    source_key: string;
    provider_family: string;
  },
  tenantId: string | null = null
): Promise<IngestionSourceStateRow> {
  const prev = await loadIngestionSourceState(patch.source_key, tenantId);
  const now = new Date().toISOString();
  const next: IngestionSourceStateRow = {
    tenant_id: tenantId,
    source_key: patch.source_key,
    provider_family: patch.provider_family,
    enabled: patch.enabled ?? prev?.enabled ?? true,
    health_state: patch.health_state ?? prev?.health_state ?? "unknown",
    parser_type: patch.parser_type ?? prev?.parser_type ?? null,
    last_attempted_at: patch.last_attempted_at ?? prev?.last_attempted_at ?? null,
    last_successful_at:
      patch.last_successful_at ?? prev?.last_successful_at ?? null,
    last_new_item_at: patch.last_new_item_at ?? prev?.last_new_item_at ?? null,
    last_item_timestamp:
      patch.last_item_timestamp ?? prev?.last_item_timestamp ?? null,
    cursor_token: patch.cursor_token ?? prev?.cursor_token ?? null,
    etag: patch.etag ?? prev?.etag ?? null,
    last_modified: patch.last_modified ?? prev?.last_modified ?? null,
    consecutive_failures:
      patch.consecutive_failures ?? prev?.consecutive_failures ?? 0,
    consecutive_empty_runs:
      patch.consecutive_empty_runs ?? prev?.consecutive_empty_runs ?? 0,
    disabled_until: patch.disabled_until ?? prev?.disabled_until ?? null,
    quota_exhausted_until:
      patch.quota_exhausted_until ?? prev?.quota_exhausted_until ?? null,
    rate_limited_until:
      patch.rate_limited_until ?? prev?.rate_limited_until ?? null,
    retirement_reason:
      patch.retirement_reason ?? prev?.retirement_reason ?? null,
    last_error_category:
      patch.last_error_category ?? prev?.last_error_category ?? null,
    lease_owner: patch.lease_owner ?? prev?.lease_owner ?? null,
    lease_expires_at: patch.lease_expires_at ?? prev?.lease_expires_at ?? null,
    metadata: { ...(prev?.metadata ?? {}), ...(patch.metadata ?? {}) },
    updated_at: now,
  };

  memory.set(memoryKey(tenantId, patch.source_key), next);

  if (!isSupabaseConfigured()) return next;

  try {
    const supabase = db();
    const { data, error } = await supabase
      .from("ingestion_source_state")
      .upsert(
        {
          ...next,
          tenant_id: tenantId,
        },
        tenantId
          ? { onConflict: "tenant_id,source_key" }
          : { onConflict: "source_key" }
      )
      .select("*")
      .maybeSingle();

    // Partial unique indexes may not map cleanly to onConflict — fall back to select+update/insert.
    if (error) {
      let existingQ = supabase
        .from("ingestion_source_state")
        .select("id")
        .eq("source_key", patch.source_key)
        .limit(1);
      existingQ = tenantId
        ? existingQ.eq("tenant_id", tenantId)
        : existingQ.is("tenant_id", null);
      const { data: existing } = await existingQ.maybeSingle();
      if (existing?.id) {
        await supabase
          .from("ingestion_source_state")
          .update(next)
          .eq("id", existing.id);
      } else {
        await supabase.from("ingestion_source_state").insert(next);
      }
    } else if (data) {
      memory.set(memoryKey(tenantId, patch.source_key), data as IngestionSourceStateRow);
      return data as IngestionSourceStateRow;
    }
  } catch (err) {
    console.warn("[ingestion-source-state] upsert failed:", err);
  }

  return next;
}

/**
 * Compare-and-set cursor advance: only write when previous last_item_timestamp
 * matches expectedPrevious (or both null). Prevents overlapping runs from
 * skipping unseen windows.
 */
export async function advanceSourceCursorSafe(input: {
  sourceKey: string;
  providerFamily: string;
  tenantId?: string | null;
  expectedPrevious: string | null;
  nextTimestamp: string;
  cursorToken?: string | null;
  newItemCount?: number;
}): Promise<{ advanced: boolean }> {
  const tenantId = input.tenantId ?? null;
  const current = await loadIngestionSourceState(input.sourceKey, tenantId);
  const prevTs = current?.last_item_timestamp ?? null;
  if (prevTs !== input.expectedPrevious) {
    return { advanced: false };
  }

  const now = new Date().toISOString();
  await upsertIngestionSourceState(
    {
      source_key: input.sourceKey,
      provider_family: input.providerFamily,
      last_item_timestamp: input.nextTimestamp,
      cursor_token: input.cursorToken ?? current?.cursor_token ?? null,
      last_successful_at: now,
      last_new_item_at:
        (input.newItemCount ?? 0) > 0
          ? now
          : current?.last_new_item_at ?? null,
      health_state: "healthy",
      consecutive_failures: 0,
      consecutive_empty_runs:
        (input.newItemCount ?? 0) > 0
          ? 0
          : (current?.consecutive_empty_runs ?? 0) + 1,
    },
    tenantId
  );
  return { advanced: true };
}

export async function markProviderQuotaExhausted(input: {
  sourceKey: string;
  providerFamily: string;
  untilIso?: string;
  tenantId?: string | null;
  errorCategory?: string;
}): Promise<void> {
  await upsertIngestionSourceState(
    {
      source_key: input.sourceKey,
      provider_family: input.providerFamily,
      health_state: "quota_exhausted",
      quota_exhausted_until: input.untilIso ?? nextUtcMidnightIso(),
      last_error_category: input.errorCategory ?? "quota_exhausted",
      last_attempted_at: new Date().toISOString(),
    },
    input.tenantId ?? null
  );
}

export async function markSourcePermanentlyRetired(input: {
  sourceKey: string;
  providerFamily: string;
  reason: string;
  tenantId?: string | null;
}): Promise<void> {
  await upsertIngestionSourceState(
    {
      source_key: input.sourceKey,
      provider_family: input.providerFamily,
      enabled: false,
      health_state: "permanently_retired",
      retirement_reason: input.reason,
      last_error_category: "permanently_retired",
      disabled_until: null,
    },
    input.tenantId ?? null
  );
}

/** Overlap window hours for incremental published-after filtering. */
export const INCREMENTAL_OVERLAP_HOURS = 2;

export function publishedAfterIsoFromCursor(
  lastItemTimestamp: string | null,
  overlapHours = INCREMENTAL_OVERLAP_HOURS
): string | null {
  if (!lastItemTimestamp) return null;
  const t = new Date(lastItemTimestamp).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(t - overlapHours * 3600_000).toISOString();
}

export function filterArticlesByPublishedAfter<
  T extends { published_at?: string | null },
>(articles: T[], publishedAfterIso: string | null): { kept: T[]; filtered: number } {
  if (!publishedAfterIso) return { kept: articles, filtered: 0 };
  const cutoff = new Date(publishedAfterIso).getTime();
  if (!Number.isFinite(cutoff)) return { kept: articles, filtered: 0 };
  const kept: T[] = [];
  let filtered = 0;
  for (const a of articles) {
    const pub = a.published_at ? new Date(a.published_at).getTime() : NaN;
    // Keep items without timestamps (late/unknown) to avoid content loss.
    if (!Number.isFinite(pub) || pub >= cutoff) kept.push(a);
    else filtered += 1;
  }
  return { kept, filtered };
}
