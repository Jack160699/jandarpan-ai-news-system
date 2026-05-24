import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { buildLiveHomepageSnapshot } from "@/lib/realtime/build-snapshot";
import { REALTIME_CONFIG } from "@/lib/realtime/config";
import { errorLiveFeed } from "@/lib/news/live-feed/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const startedAt = Date.now();

  try {
    const { snapshot, meta } = await buildLiveHomepageSnapshot();

    if (!snapshot) {
      errorLiveFeed("live_api_empty", { meta, durationMs: Date.now() - startedAt });
      return NextResponse.json(
        {
          ok: false,
          error: "empty_feed",
          code: "EMPTY_FEED",
          retryable: true,
          meta,
        },
        { status: 503, headers: noStoreHeaders() }
      );
    }

    return NextResponse.json(
      { ok: true, snapshot, meta },
      {
        headers: {
          ...noStoreHeaders(),
          "Cache-Control": `private, max-age=${REALTIME_CONFIG.clientCacheMaxAgeSec}`,
          "X-Live-Source": meta.source,
          "X-Live-Pool-Size": String(meta.poolSize),
          ...(meta.rateLimited ? { "X-Live-Rate-Limited": "1" } : {}),
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    errorLiveFeed("live_api_error", { error: message, durationMs: Date.now() - startedAt });
    return NextResponse.json(
      {
        ok: false,
        error: message,
        code: "FETCH_FAILED",
        retryable: true,
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}
