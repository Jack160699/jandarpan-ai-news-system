/**
 * API route observability wrapper — request ID, tracing, metrics, errors
 */

import { NextResponse } from "next/server";
import {
  generateRequestId,
  getRequestIdFromHeaders,
  REQUEST_ID_HEADER,
} from "@/lib/observability/request-id";
import { startTrace, withSpan } from "@/lib/observability/tracing";
import { recordApiMetric } from "@/lib/observability/metrics";
import { trackOpsError } from "@/lib/observability/errors";
import { opsLogger } from "@/lib/observability/logger";

export type ObservedHandler = (
  request: Request,
  ctx: { requestId: string; traceId: string }
) => Promise<Response>;

export function withObservability(
  routeName: string,
  handler: ObservedHandler
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const requestId =
      getRequestIdFromHeaders(request.headers) ?? generateRequestId();
    const trace = startTrace(routeName, requestId);
    const started = Date.now();
    let status = 500;

    try {
      const response = await withSpan(trace, "handler", () =>
        handler(request, { requestId, traceId: trace.traceId })
      );
      status = response.status;

      const headers = new Headers(response.headers);
      headers.set(REQUEST_ID_HEADER, requestId);

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "internal_error";
      await trackOpsError({
        source: "api",
        route: routeName,
        message,
        severity: "high",
        requestId,
        err,
      });

      status = 500;
      return NextResponse.json(
        { ok: false, error: message, requestId },
        {
          status: 500,
          headers: { [REQUEST_ID_HEADER]: requestId },
        }
      );
    } finally {
      const durationMs = Date.now() - started;
      await recordApiMetric({
        route: routeName,
        method: request.method,
        status,
        durationMs,
        ts: new Date().toISOString(),
      });

      opsLogger.info("api_request", {
        requestId,
        route: routeName,
        method: request.method,
        status,
        durationMs,
      });
    }
  };
}
