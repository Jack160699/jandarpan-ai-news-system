import { NextResponse } from "next/server";

/**
 * Legacy inventing CG rates endpoint — permanently disabled.
 * Use verified-rates APIs only when accepted consensus snapshots exist.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "unavailable",
      error: "cg_rates_retired",
      message:
        "Invented market jitter is disabled. Verified rates require licensed providers and consensus.",
      methodology: "/rates/methodology",
    },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
