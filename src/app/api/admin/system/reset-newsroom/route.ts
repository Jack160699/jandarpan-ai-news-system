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
    const mode = url.searchParams.get("mode"); // "dry-run" or "execute"
    const supabase = createAdminServerClient();

    // Tables to reset based on user specification
    const tables = [
      "generated_articles",
      "news_ai_queue",
      "worker_jobs",
      "event_bus_messages",
      "news_events",
      "editorial_image_generations",
      "dam_media",
      "news_signals"
    ];

    const inventory: Record<string, number> = {};

    // Dry-run: Count rows
    if (mode === "dry-run" || !mode) {
      for (const table of tables) {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });
        
        if (error) {
          inventory[table] = -1;
          console.error(`Error counting ${table}:`, error);
        } else {
          inventory[table] = count || 0;
        }
      }
      return NextResponse.json({
        status: "dry-run",
        message: "Dry-run inventory counted.",
        inventory,
      });
    }

    // Execute: Delete rows safely
    if (mode === "execute") {
      // Deletion order is critical for FKs
      const deleteOrder = [
        "event_bus_messages",
        "worker_jobs",
        "generated_articles",
        "news_ai_queue",
        "editorial_image_generations",
        "dam_media",
        "news_signals",
        "news_events" // Delete events last
      ];

      for (const table of deleteOrder) {
        // Delete all trick
        const { error } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); 
          
        if (error) {
          inventory[table] = -1;
          console.error(`Error deleting ${table}:`, error);
        } else {
          inventory[table] = 1;
        }
      }
      return NextResponse.json({
        status: "execute",
        message: "Reset executed.",
        inventory,
      });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
