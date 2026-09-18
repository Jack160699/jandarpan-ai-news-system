import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { requireSuperAdminSession } from "@/lib/newsroom-auth/require-super-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const guard = await requireSuperAdminSession(request);
  if (!guard.ok) return guard.response;

  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");
    const supabase = createAdminServerClient();

    const inventory: Record<string, number> = {};

    // Dry-run: Count rows
    if (mode === "dry-run" || !mode) {
      const queries = [
        { name: "generated_articles", query: supabase.from("generated_articles").select("*", { count: "exact", head: true }) },
        { name: "news_ai_queue", query: supabase.from("news_ai_queue").select("*", { count: "exact", head: true }) },
        { name: "worker_jobs", query: supabase.from("worker_jobs").select("*", { count: "exact", head: true }).in("job_type", ["editorial_generate", "image_generate", "tts_generate", "ai_enrich"]) },
        { name: "event_bus_messages", query: supabase.from("event_bus_messages").select("*", { count: "exact", head: true }).in("event_type", ["article.generated", "article.published", "article.rejected", "article.scheduled"]) },
        { name: "news_events", query: supabase.from("news_events").select("*", { count: "exact", head: true }) },
        { name: "editorial_image_generations", query: supabase.from("editorial_image_generations").select("*", { count: "exact", head: true }) },
      ];

      for (const { name, query } of queries) {
        const { count, error } = await query;
        inventory[name] = error ? -1 : (count || 0);
      }
      
      return NextResponse.json({
        status: "dry-run",
        message: "Inventory counted. Infrastructure preserved.",
        inventory,
      });
    }

    if (mode === "execute") {
      // 1. Delete content-related event bus messages
      await supabase.from("event_bus_messages")
        .delete()
        .in("event_type", ["article.generated", "article.published", "article.rejected", "article.scheduled", "generation.failed", "tts.completed"]);
      inventory["event_bus_messages"] = 1;

      // 2. Delete content-related worker jobs
      await supabase.from("worker_jobs")
        .delete()
        .in("job_type", ["editorial_generate", "image_generate", "tts_generate", "ai_enrich", "ingest"]);
      inventory["worker_jobs"] = 1;

      // 3. Delete generated articles
      await supabase.from("generated_articles").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      inventory["generated_articles"] = 1;

      // 4. Delete AI queue
      await supabase.from("news_ai_queue").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      inventory["news_ai_queue"] = 1;

      // 5. Delete images
      await supabase.from("editorial_image_generations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      inventory["editorial_image_generations"] = 1;

      // 6. Delete news events (source of truth)
      await supabase.from("news_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      inventory["news_events"] = 1;

      return NextResponse.json({
        status: "execute",
        message: "Safe reset executed.",
        inventory,
      });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
