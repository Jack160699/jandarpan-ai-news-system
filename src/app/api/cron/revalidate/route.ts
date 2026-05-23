/**
 * GET/POST /api/cron/revalidate — on-demand homepage ISR refresh (Vercel cron)
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { revalidateNewsroomCaches } from "@/lib/infrastructure/cache/isr";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  return handleRevalidate(request);
}

export async function POST(request: Request) {
  return handleRevalidate(request);
}

async function handleRevalidate(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders() }
    );
  }

  await revalidateNewsroomCaches();

  return NextResponse.json(
    {
      ok: true,
      revalidated: true,
      timestamp: new Date().toISOString(),
    },
    { headers: noStoreHeaders() }
  );
}
