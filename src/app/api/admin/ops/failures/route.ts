/**
 * GET /api/admin/ops/failures?category=provider_quota — the underlying jobs / queue rows /
 * held articles behind a failure-center category. Auth: monitoring:read.
 */

import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-authorization";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { createAdminServerClient } from "@/lib/supabase";
import { categorizeFailure, FAILURE_CATEGORY_LABEL, type FailureCategory } from "@/lib/admin-ops/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FailureRow = {
  kind: "queue_item" | "worker_job" | "held_article" | "ai_call" | "cron_run";
  id: string;
  title: string | null;
  reason: string;
  status: string | null;
  at: string | null;
  href?: string;
};

export async function GET(request: Request) {
  const auth = await requireAdminPermission(request, "monitoring:read");
  if (!auth.ok) return auth.response;

  const category = new URL(request.url).searchParams.get("category") as FailureCategory | null;
  if (!category || !(category in FAILURE_CATEGORY_LABEL)) {
    return NextResponse.json({ ok: false, error: "unknown_category" }, { status: 400, headers: noStoreHeaders() });
  }

  const supabase = createAdminServerClient();
  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const since24h = new Date(Date.now() - 86_400_000).toISOString();
  const rows: FailureRow[] = [];

  const [queue, jobs, held, ai, cron] = await Promise.all([
    supabase
      .from("news_ai_queue" as never)
      .select("id,status,failure_class,reject_reason,error,updated_at,article_id,news_articles(title)")
      .not("status", "in", "(pending,processing,completed)")
      .order("updated_at", { ascending: false })
      .limit(400),
    supabase
      .from("worker_jobs")
      .select("id,job_type,status,last_error,updated_at")
      .in("status", ["dead", "failed"])
      .gte("created_at", since7d)
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("generated_articles")
      .select("id,slug,headline,editorial_status,created_at,editorial_metadata")
      .eq("editorial_status", "pending")
      .gte("created_at", since7d)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("ai_provider_usage_events" as never)
      .select("id,provider,model,operation,fallback_reason,article_id,created_at")
      .eq("success", false)
      .gte("created_at", since24h)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("ops_cron_runs")
      .select("id,job,error,created_at")
      .eq("ok", false)
      .gte("created_at", since24h)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  for (const q of ((queue.data as unknown) as Array<Record<string, unknown>> | null) ?? []) {
    const reason = String(q.failure_class ?? q.reject_reason ?? q.error ?? q.status);
    const art = q.news_articles as { title?: string } | null;
    rows.push({ kind: "queue_item", id: String(q.id), title: art?.title ?? null, reason, status: String(q.status), at: (q.updated_at as string) ?? null });
  }
  for (const j of jobs.data ?? []) {
    rows.push({ kind: "worker_job", id: j.id, title: j.job_type, reason: j.last_error ?? "unknown", status: j.status, at: j.updated_at });
  }
  for (const a of held.data ?? []) {
    const meta = (a.editorial_metadata ?? {}) as Record<string, unknown>;
    const gates = (meta.publication_gates as { failures?: Array<{ code: string }> } | undefined)?.failures?.map((f) => f.code) ?? [];
    const rejections = Array.isArray(meta.rejection_reasons) ? (meta.rejection_reasons as string[]) : [];
    const reason = [...gates, ...rejections].join(", ") || "held for review";
    rows.push({ kind: "held_article", id: a.id, title: a.headline, reason, status: a.editorial_status, at: a.created_at, href: `/admin/articles?id=${a.id}` });
  }
  for (const e of ((ai.data as unknown) as Array<Record<string, unknown>> | null) ?? []) {
    rows.push({
      kind: "ai_call",
      id: String(e.id),
      title: `${e.provider}/${e.model} · ${e.operation}`,
      reason: String(e.fallback_reason ?? "unknown"),
      status: "failed",
      at: (e.created_at as string) ?? null,
    });
  }
  for (const c of cron.data ?? []) {
    rows.push({ kind: "cron_run", id: c.id, title: c.job, reason: c.error ?? "cron failure", status: "failed", at: c.created_at });
  }

  const matched = rows.filter((r) => categorizeFailure(r.reason) === category).slice(0, 60);
  return NextResponse.json(
    { ok: true, category, label: FAILURE_CATEGORY_LABEL[category], total: matched.length, rows: matched },
    { headers: noStoreHeaders() }
  );
}
