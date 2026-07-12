/**
 * GET /api/health/live — public liveness probe (process up)
 */

import { NextResponse } from "next/server";
import { edgeCacheHeaders } from "@/lib/infrastructure/cache/edge";
import {
  generateRequestId,
  REQUEST_ID_HEADER,
} from "@/lib/observability/request-id";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId =
    request.headers.get(REQUEST_ID_HEADER) ?? generateRequestId();

  return NextResponse.json(
    {
      ok: true,
      probe: "live",
      service: "jan-darpan-os",
      status: "alive",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        ...edgeCacheHeaders({ sMaxAge: 5, private: true }),
        [REQUEST_ID_HEADER]: requestId,
      },
    }
  );
}
