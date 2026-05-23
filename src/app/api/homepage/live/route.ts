import { NextResponse } from "next/server";
import { buildLiveHomepageSnapshot } from "@/lib/realtime/build-snapshot";
import { REALTIME_CONFIG } from "@/lib/realtime/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const snapshot = await buildLiveHomepageSnapshot();
    if (!snapshot) {
      return NextResponse.json(
        { ok: false, error: "empty_feed" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { ok: true, snapshot },
      {
        headers: {
          "Cache-Control": `private, max-age=${REALTIME_CONFIG.clientCacheMaxAgeSec}`,
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
