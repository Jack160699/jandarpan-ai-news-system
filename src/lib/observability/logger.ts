/**
 * Structured logging for Jan Darpan OS
 */

import type { LogContext } from "@/lib/observability/types";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function minLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env === "debug" || env === "info" || env === "warn" || env === "error") {
    return env;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel()];
}

export type StructuredLogEntry = {
  level: LogLevel;
  service: string;
  message: string;
  ts: string;
  requestId?: string;
  traceId?: string;
  span?: string;
  durationMs?: number;
  error?: { name: string; message: string; stack?: string };
  context?: LogContext;
};

function emit(entry: StructuredLogEntry): void {
  const line = JSON.stringify(entry);
  switch (entry.level) {
    case "error":
      console.error(`[${entry.service}]`, line);
      break;
    case "warn":
      console.warn(`[${entry.service}]`, line);
      break;
    default:
      console.log(`[${entry.service}]`, line);
  }
}

export function createLogger(service: string, baseContext?: LogContext) {
  function log(
    level: LogLevel,
    message: string,
    extra?: LogContext & {
      requestId?: string;
      traceId?: string;
      span?: string;
      durationMs?: number;
      err?: unknown;
    }
  ): void {
    if (!shouldLog(level)) return;

    const { err, requestId, traceId, span, durationMs, ...context } = extra ?? {};

    const entry: StructuredLogEntry = {
      level,
      service,
      message,
      ts: new Date().toISOString(),
      requestId,
      traceId,
      span,
      durationMs,
      context: { ...baseContext, ...context },
    };

    if (err instanceof Error) {
      entry.error = {
        name: err.name,
        message: err.message,
        stack: err.stack?.split("\n").slice(0, 8).join("\n"),
      };
    } else if (err) {
      entry.error = { name: "Error", message: String(err) };
    }

    emit(entry);
  }

  return {
    debug: (msg: string, ctx?: LogContext) => log("debug", msg, ctx),
    info: (msg: string, ctx?: LogContext) => log("info", msg, ctx),
    warn: (msg: string, ctx?: LogContext) => log("warn", msg, ctx),
    error: (msg: string, ctx?: LogContext & { err?: unknown }) =>
      log("error", msg, ctx),
  };
}

export const opsLogger = createLogger("jan-darpan-ops");
