import { NextResponse } from "next/server";
import { persistReaderEvents } from "@/lib/analytics/persist";
import { getTenantConfig } from "@/lib/tenant/resolve";

export const runtime = "nodejs";

type LegacyBody = {
  event: "view" | "dwell" | "share" | "trending_click";
  slug: string;
  dwellMs?: number;
  source?: string | null;
  category?: string;
  provider?: string | null;
};

/** Legacy endpoint — forwards to analytics engine */
export async function POST(request: Request) {
  let body: LegacyBody;

  try {
    body = (await request.json()) as LegacyBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body.slug || !body.event) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const tenant = await getTenantConfig();
  const map = {
    view: "article_view" as const,
    dwell: "dwell" as const,
    share: "share" as const,
    trending_click: "article_click" as const,
  };

  await persistReaderEvents(tenant.id, null, [
    {
      eventType: map[body.event],
      articleSlug: body.slug,
      category: body.category,
      surface: body.event === "trending_click" ? "homepage" : "story",
      valueNum: body.dwellMs,
      metadata: { source: body.source, provider: body.provider },
    },
  ]);

  return NextResponse.json({ ok: true });
}
