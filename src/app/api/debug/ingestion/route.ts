import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { createAdminClient } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const auth = await verifyCronRequest(request);
  if (!auth.authorized) return cronAuthFailureResponse(auth);

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  const supabase = createAdminClient();
  const started = Date.now();

  const latestIngestLog = await supabase
    .from("ingestion_logs")
    .select("id,status,inserted,total_fetched,duration_ms,created_at,metadata")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestFailure = await supabase
    .from("ingestion_failures")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestRssHealth = await supabase
    .from("rss_source_health")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(5);

  const latestNewsArticle = await supabase
    .from("news_articles")
    .select("id,title,source,created_at,published_at,category")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [
    newsArticlesCount,
    pendingJobs,
    claimedJobs,
    deadJobs,
    jobRuns,
  ] = await Promise.all([
    supabase.from("news_articles").select("id", { count: "exact", head: true }),
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "claimed"),
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "dead"),
    supabase.from("worker_job_runs").select("id", { count: "exact", head: true }),
  ]);

  return NextResponse.json(
    {
      ok: true,
      durationMs: Date.now() - started,
      latestIngestLog: {
        data: latestIngestLog.data,
        error: latestIngestLog.error?.message ?? null,
      },
      latestFailure: {
        data: latestFailure.data,
        error: latestFailure.error?.message ?? null,
      },
      latestRssHealth: {
        data: latestRssHealth.data ?? [],
        error: latestRssHealth.error?.message ?? null,
      },
      latestNewsArticle: {
        data: latestNewsArticle.data,
        error: latestNewsArticle.error?.message ?? null,
      },
      counts: {
        news_articles: newsArticlesCount.count ?? null,
        worker_jobs_pending: pendingJobs.count ?? null,
        worker_jobs_claimed: claimedJobs.count ?? null,
        worker_jobs_dead: deadJobs.count ?? null,
        worker_job_runs: jobRuns.count ?? null,
      },
      checkedAt: new Date().toISOString(),
    },
    { headers: noStoreHeaders() }
  );
}

