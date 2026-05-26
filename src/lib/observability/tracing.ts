/**
 * Lightweight API tracing spans (no external collector required)
 */

import { generateRequestId } from "@/lib/observability/request-id";
import { opsLogger } from "@/lib/observability/logger";
import type { LogContext } from "@/lib/observability/types";

export type TraceSpan = {
  traceId: string;
  spanId: string;
  name: string;
  startedAt: number;
  parentSpanId?: string;
  attributes?: LogContext;
};

export type TraceContext = {
  traceId: string;
  requestId: string;
  rootSpan: TraceSpan;
};

export function startTrace(name: string, requestId?: string): TraceContext {
  const traceId = generateRequestId();
  const rid = requestId ?? traceId;
  const rootSpan: TraceSpan = {
    traceId,
    spanId: generateRequestId(),
    name,
    startedAt: Date.now(),
  };
  return { traceId, requestId: rid, rootSpan };
}

export async function withSpan<T>(
  ctx: TraceContext,
  name: string,
  fn: () => Promise<T>,
  attributes?: LogContext
): Promise<T> {
  const span: TraceSpan = {
    traceId: ctx.traceId,
    spanId: generateRequestId(),
    name,
    startedAt: Date.now(),
    parentSpanId: ctx.rootSpan.spanId,
    attributes,
  };

  try {
    const result = await fn();
    const durationMs = Date.now() - span.startedAt;
    opsLogger.debug("span_complete", {
      traceId: ctx.traceId,
      requestId: ctx.requestId,
      span: name,
      durationMs,
      ...attributes,
    });
    return result;
  } catch (err) {
    const durationMs = Date.now() - span.startedAt;
    opsLogger.error("span_failed", {
      traceId: ctx.traceId,
      requestId: ctx.requestId,
      span: name,
      durationMs,
      err,
      ...attributes,
    });
    throw err;
  }
}
