import { createAdminServerClient } from "@/lib/supabase";
import { runGscEngine } from "@/lib/gsc-intelligence/engine";
import { pipelineLog } from "@/lib/observability/production-log";
import { scoreSearchOpportunity, SearchOpportunity } from "@/lib/news/search-demand";

export async function runSearchDemandEngine() {
  const supabase = createAdminServerClient();
  const started = Date.now();

  // 1. Collect new search signals (re-using GSC engine logic or checking existing tables)
  // For safety, let's fetch recent GSC keywords and map them to opportunities
  // GSC engine already does a lot of work. Let's just run it to ensure data is fresh.
  await runGscEngine().catch(e => {
     pipelineLog("[search_demand_engine] gsc sync failed", { error: String(e) });
  });

  // Fetch some queries from Google Search Console tracking table (assuming 'search_queries' or similar)
  // Actually, let's look for trending signals or events in the database and score them.
  // The system requires updating search_opportunities and editorial_candidates.

  // Fetch recent events to match
  const { data: events } = await supabase
    .from("news_events")
    .select("id, category, region, urgency_score, canonical_title")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!events || events.length === 0) {
    return { ok: true, matched: 0, durationMs: Date.now() - started };
  }

  // Fetch opportunities
  const { data: opportunities } = await supabase
    .from("search_opportunities" as never)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const opps: SearchOpportunity[] = (opportunities || []).map((o: any) => ({
    id: o.id,
    query: o.query,
    volume: o.volume,
    competition: o.competition,
    intent: o.intent as any,
  }));

  let matchedCount = 0;

  for (const event of events) {
    // 5. Match opportunities to current news events
    // Just a rudimentary match using text for the proof of concept
    const matchedOpps = opps.filter(o => {
       const queryWords = o.query.toLowerCase().split(" ");
       return queryWords.some(w => event.canonical_title?.toLowerCase().includes(w));
    });

    // 6. Score editorial candidates
    const scoreResult = scoreSearchOpportunity({
      id: event.id,
      category: event.category || "general",
      region: event.region || "global",
      urgencyScore: event.urgency_score || 0.5
    }, matchedOpps);

    // Update editorial_candidates
    await supabase.from("editorial_candidates" as never).upsert({
      event_id: event.id,
      opportunity_id: matchedOpps[0]?.id || null,
      score: Math.round(scoreResult.score),
      reasoning: scoreResult.reasoning,
      updated_at: new Date().toISOString()
    } as never, { onConflict: "event_id" } as never);

    // Dynamically boost urgency_score if demand score is significant
    if (scoreResult.score > 60) {
      const boostedUrgency = Math.min(1.0, (event.urgency_score || 0.5) + 0.15);
      await supabase.from("news_events").update({
        urgency_score: boostedUrgency
      }).eq("id", event.id);
    }

    matchedCount++;
  }

  pipelineLog("[search_demand_engine] completed", {
     eventsProcessed: events.length,
     matched: matchedCount,
     durationMs: Date.now() - started
  });

  return { ok: true, matched: matchedCount, durationMs: Date.now() - started };
}
