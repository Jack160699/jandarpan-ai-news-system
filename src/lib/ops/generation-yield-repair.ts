/**
 * Safe generation-yield repair — dry-run by default.
 *
 * Does not invent signal relationships. Quarantines obsolete dangling-signal
 * events by annotating clustering_metadata only (no deletes).
 */

import {
  AUTO_GENERATION_MAX_AGE_HOURS,
  OBSOLETE_DANGLING_SIGNAL_AGE_HOURS,
  classifyNoSignalsForEvent,
} from "@/lib/news/ai/event-signal-yield";
import { createAdminServerClient } from "@/lib/supabase";

export type YieldRepairCommand =
  | "audit"
  | "quarantine-obsolete"
  | "verify";

export type YieldRepairOptions = {
  dryRun?: boolean;
  command?: YieldRepairCommand;
  tenantId?: string | null;
  batchSize?: number;
  maxAgeHours?: number;
  minAgeHours?: number;
  stopOnErrorThreshold?: number;
};

export type YieldEventAuditRow = {
  eventId: string;
  createdAt: string;
  urgencyScore: number;
  listedSignalIds: number;
  foundSignalIds: number;
  classification: string;
  reason: string;
  retryable: boolean;
  alreadyGenerated: boolean;
  action: "none" | "quarantine_obsolete" | "already_quarantined";
};

export type YieldRepairResult = {
  dryRun: boolean;
  command: YieldRepairCommand;
  examined: number;
  quarantined: number;
  alreadyQuarantined: number;
  skipped: number;
  errors: string[];
  stoppedOnError: boolean;
  rows: YieldEventAuditRow[];
  summary: string;
  before?: {
    danglingOutsideWindow: number;
    unusedResolvableInWindow: number;
  };
  after?: {
    danglingOutsideWindow: number;
    unusedResolvableInWindow: number;
  };
};

const QUARANTINE_FLAG = "generation_yield_quarantine";

function asMeta(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

async function loadGeneratedEventIds(
  eventIds: string[]
): Promise<Set<string>> {
  const set = new Set<string>();
  if (!eventIds.length) return set;
  const supabase = createAdminServerClient();
  const chunk = 100;
  for (let i = 0; i < eventIds.length; i += chunk) {
    const ids = eventIds.slice(i, i + chunk);
    const { data } = await supabase
      .from("generated_articles")
      .select("event_id")
      .in("event_id", ids);
    for (const row of data ?? []) {
      if (row.event_id) set.add(row.event_id);
    }
  }
  return set;
}

async function countPoolMetrics(): Promise<{
  danglingOutsideWindow: number;
  unusedResolvableInWindow: number;
}> {
  const supabase = createAdminServerClient();
  const windowStart = new Date(
    Date.now() - AUTO_GENERATION_MAX_AGE_HOURS * 3_600_000
  ).toISOString();

  const { data: outside } = await supabase
    .from("news_events")
    .select("id, signal_ids, created_at, is_live, clustering_metadata")
    .lt("created_at", windowStart)
    .order("urgency_score", { ascending: false })
    .limit(200);

  let danglingOutsideWindow = 0;
  const signalIds = new Set<string>();
  for (const e of outside ?? []) {
    for (const id of e.signal_ids ?? []) signalIds.add(id);
  }
  const existing = new Set<string>();
  const ids = [...signalIds];
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabase
      .from("news_signals")
      .select("id")
      .in("id", ids.slice(i, i + 100));
    for (const row of data ?? []) existing.add(row.id);
  }
  for (const e of outside ?? []) {
    const listed = e.signal_ids?.length ?? 0;
    const found = (e.signal_ids ?? []).filter((id) => existing.has(id)).length;
    if (listed > 0 && found === 0) danglingOutsideWindow += 1;
  }

  const { data: inside } = await supabase
    .from("news_events")
    .select("id, signal_ids")
    .gte("created_at", windowStart)
    .limit(500);
  const insideIds = (inside ?? []).map((e) => e.id);
  const generated = await loadGeneratedEventIds(insideIds);
  let unusedResolvableInWindow = 0;
  const insideSignalIds = new Set<string>();
  for (const e of inside ?? []) {
    for (const id of e.signal_ids ?? []) insideSignalIds.add(id);
  }
  const insideExisting = new Set<string>();
  const insideArr = [...insideSignalIds];
  for (let i = 0; i < insideArr.length; i += 100) {
    const { data } = await supabase
      .from("news_signals")
      .select("id")
      .in("id", insideArr.slice(i, i + 100));
    for (const row of data ?? []) insideExisting.add(row.id);
  }
  for (const e of inside ?? []) {
    if (generated.has(e.id)) continue;
    const found = (e.signal_ids ?? []).filter((id) =>
      insideExisting.has(id)
    ).length;
    if (found > 0) unusedResolvableInWindow += 1;
  }

  return { danglingOutsideWindow, unusedResolvableInWindow };
}

export async function runGenerationYieldRepair(
  options: YieldRepairOptions = {}
): Promise<YieldRepairResult> {
  const dryRun = options.dryRun !== false;
  const command = options.command ?? "audit";
  const batchSize = Math.min(Math.max(options.batchSize ?? 25, 1), 100);
  const minAgeHours = options.minAgeHours ?? OBSOLETE_DANGLING_SIGNAL_AGE_HOURS;
  const maxAgeHours = options.maxAgeHours ?? 365 * 24;
  const stopOnError = options.stopOnErrorThreshold ?? 3;

  const supabase = createAdminServerClient();
  const before = await countPoolMetrics();
  const errors: string[] = [];
  const rows: YieldEventAuditRow[] = [];
  let quarantined = 0;
  let alreadyQuarantined = 0;
  let skipped = 0;
  let stoppedOnError = false;

  const olderThan = new Date(Date.now() - minAgeHours * 3_600_000).toISOString();
  const newerThan = new Date(Date.now() - maxAgeHours * 3_600_000).toISOString();

  let query = supabase
    .from("news_events")
    .select(
      "id, created_at, urgency_score, signal_ids, is_live, clustering_metadata, tenant_id"
    )
    .lte("created_at", olderThan)
    .gte("created_at", newerThan)
    .order("urgency_score", { ascending: false })
    .limit(batchSize * 4);

  if (options.tenantId) {
    query = query.eq("tenant_id", options.tenantId);
  }

  const { data: events, error } = await query;
  if (error) {
    return {
      dryRun,
      command,
      examined: 0,
      quarantined: 0,
      alreadyQuarantined: 0,
      skipped: 0,
      errors: [error.message],
      stoppedOnError: true,
      rows: [],
      summary: `query_failed:${error.message}`,
      before,
    };
  }

  const eventIds = (events ?? []).map((e) => e.id);
  const generated = await loadGeneratedEventIds(eventIds);

  const allSignalIds = new Set<string>();
  for (const e of events ?? []) {
    for (const id of e.signal_ids ?? []) allSignalIds.add(id);
  }
  const existing = new Set<string>();
  const sigArr = [...allSignalIds];
  for (let i = 0; i < sigArr.length; i += 100) {
    const { data } = await supabase
      .from("news_signals")
      .select("id")
      .in("id", sigArr.slice(i, i + 100));
    for (const row of data ?? []) existing.add(row.id);
  }

  for (const event of events ?? []) {
    if (rows.length >= batchSize && command !== "verify") break;

    const found = (event.signal_ids ?? []).filter((id) =>
      existing.has(id)
    ).length;
    const classification = classifyNoSignalsForEvent({
      event: {
        created_at: event.created_at,
        is_live: Boolean(event.is_live),
        signal_ids: event.signal_ids ?? [],
      },
      foundSignalCount: found,
    });

    if (classification.class !== "obsolete_dangling_signals") {
      skipped += 1;
      continue;
    }

    const meta = asMeta(event.clustering_metadata);
    const already = Boolean(meta[QUARANTINE_FLAG]);
    const alreadyGenerated = generated.has(event.id);

    const row: YieldEventAuditRow = {
      eventId: event.id,
      createdAt: event.created_at,
      urgencyScore: Number(event.urgency_score ?? 0),
      listedSignalIds: event.signal_ids?.length ?? 0,
      foundSignalIds: found,
      classification: classification.class,
      reason: classification.reason,
      retryable: classification.retryable,
      alreadyGenerated,
      action: already ? "already_quarantined" : "quarantine_obsolete",
    };

    if (already) {
      alreadyQuarantined += 1;
      rows.push(row);
      continue;
    }

    if (command === "quarantine-obsolete" && !dryRun) {
      const nextMeta = {
        ...meta,
        [QUARANTINE_FLAG]: {
          at: new Date().toISOString(),
          reason: classification.reason,
          listedSignalIds: row.listedSignalIds,
          foundSignalIds: row.foundSignalIds,
        },
      };
      const { error: updErr } = await supabase
        .from("news_events")
        .update({
          clustering_metadata: nextMeta,
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.id);
      if (updErr) {
        errors.push(`${event.id}:${updErr.message}`);
        if (errors.length >= stopOnError) {
          stoppedOnError = true;
          break;
        }
        continue;
      }
      quarantined += 1;
    } else if (command === "quarantine-obsolete") {
      quarantined += 1; // dry-run would-quarantine count
    }

    rows.push(row);
  }

  const after =
    command === "verify" || (!dryRun && command === "quarantine-obsolete")
      ? await countPoolMetrics()
      : undefined;

  const summary = [
    `command=${command}`,
    `dryRun=${dryRun}`,
    `examined=${events?.length ?? 0}`,
    `quarantineCandidates=${rows.length}`,
    `quarantined=${quarantined}`,
    `alreadyQuarantined=${alreadyQuarantined}`,
    `skipped=${skipped}`,
    `errors=${errors.length}`,
  ].join(" ");

  return {
    dryRun,
    command,
    examined: events?.length ?? 0,
    quarantined,
    alreadyQuarantined,
    skipped,
    errors,
    stoppedOnError,
    rows,
    summary,
    before,
    after,
  };
}
