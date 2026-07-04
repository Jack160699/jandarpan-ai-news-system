/**
 * Cron / worker route authentication
 *
 * Accepted credentials (any one):
 * - Authorization: Bearer <CRON_SECRET> (Vercel Cron, GitHub manual, QStash outbound)
 * - x-cron-secret: <CRON_SECRET>
 * - Upstash-Signature JWT (QStash primary scheduler)
 *
 * Vercel Cron (when CRON_SECRET is set) also sends x-vercel-cron: 1
 */

import { Receiver } from "@upstash/qstash";
import { isProductionDeployment } from "@/lib/infrastructure/production";

export type CronAuthResult = {
  authorized: boolean;
  bearerToken: string | null;
  cronHeader: string | null;
  vercelCron: boolean;
  expectedSecretEnv: string | null;
  qstashVerified?: boolean;
};

export type VerifyCronRequestOptions = {
  /** Raw request body — required when the route reads the body after auth (e.g. orchestrate). */
  rawBody?: string | null;
};

function isDeployedEnvironment(): boolean {
  return Boolean(process.env.VERCEL_ENV);
}

export function parseBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const raw = authorization.trim();

  const normalized = raw.replace(/^Bearer\s+/i, "").replace(/^Bearer\s+/i, "");
  const withoutColon = normalized.replace(/^:\s*/, "");
  const token = withoutColon.trim();
  return token.length > 0 ? token : null;
}

function getCronSecret(): { secret: string | null; env: string | null } {
  const trimmed = process.env.CRON_SECRET?.trim();
  if (trimmed) return { secret: trimmed, env: "CRON_SECRET" };
  return { secret: null, env: null };
}

/**
 * Internal helper (server-only): resolves the active cron secret.
 */
export function getActiveCronSecret(): { secret: string | null; env: string | null } {
  return getCronSecret();
}

function redactAuthHeader(authorization: string | null): string | null {
  if (!authorization) return null;
  if (/^Bearer\s+/i.test(authorization.trim())) return "Bearer [REDACTED]";
  return "[REDACTED]";
}

function getQStashReceiver(): Receiver | null {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY?.trim();
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY?.trim();
  if (!currentSigningKey || !nextSigningKey) return null;
  return new Receiver({ currentSigningKey, nextSigningKey });
}

async function verifyQStashSignature(
  request: Request,
  body: string
): Promise<boolean> {
  const signature = request.headers.get("upstash-signature");
  if (!signature) return false;

  const receiver = getQStashReceiver();
  if (!receiver) {
    console.warn(
      "[cron-auth] Upstash-Signature present but QSTASH signing keys are not configured"
    );
    return false;
  }

  try {
    return await receiver.verify({
      signature,
      body,
      url: request.url,
    });
  } catch (error) {
    console.warn("[cron-auth] QStash signature verification failed", error);
    return false;
  }
}

function verifyCronSecret(request: Request): CronAuthResult {
  const { secret: cronSecret, env: expectedSecretEnv } = getCronSecret();
  const authHeader = request.headers.get("authorization");
  const bearerToken = parseBearerToken(authHeader);
  const cronHeader = request.headers.get("x-cron-secret")?.trim() ?? null;
  const vercelCron = request.headers.get("x-vercel-cron") === "1";

  if (cronSecret && (bearerToken === cronSecret || cronHeader === cronSecret)) {
    return {
      authorized: true,
      bearerToken,
      cronHeader,
      vercelCron,
      expectedSecretEnv,
    };
  }

  try {
    console.warn(
      JSON.stringify({
        tag: "[cron-auth]",
        event: "auth_failed",
        authHeader: redactAuthHeader(authHeader),
        envLoaded: Boolean(cronSecret),
        expectedSecretEnv,
        bearerPresent: Boolean(bearerToken),
        cronHeaderPresent: Boolean(cronHeader),
        vercelCron,
        qstashSignature: Boolean(request.headers.get("upstash-signature")),
        path: new URL(request.url).pathname,
      })
    );
  } catch {
    // ignore logging failures
  }

  if (isProductionDeployment() || isDeployedEnvironment()) {
    return {
      authorized: false,
      bearerToken,
      cronHeader,
      vercelCron,
      expectedSecretEnv,
    };
  }

  if (process.env.NODE_ENV !== "production" && !cronSecret) {
    console.warn(
      "[cron-auth] CRON_SECRET not set — allowing unauthenticated cron in local dev only"
    );
    return {
      authorized: true,
      bearerToken,
      cronHeader,
      vercelCron,
      expectedSecretEnv,
    };
  }

  return {
    authorized: false,
    bearerToken,
    cronHeader,
    vercelCron,
    expectedSecretEnv,
  };
}

async function resolveRequestBody(
  request: Request,
  rawBody?: string | null
): Promise<string> {
  if (rawBody !== undefined && rawBody !== null) return rawBody;
  if (!request.headers.get("upstash-signature")) return "";
  try {
    return await request.clone().text();
  } catch {
    return "";
  }
}

/**
 * Validates cron/worker requests via CRON_SECRET and/or QStash request signing.
 */
export async function verifyCronRequest(
  request: Request,
  options?: VerifyCronRequestOptions
): Promise<CronAuthResult> {
  const syncResult = verifyCronSecret(request);
  if (syncResult.authorized) {
    return syncResult;
  }

  if (!request.headers.get("upstash-signature")) {
    return syncResult;
  }

  const body = await resolveRequestBody(request, options?.rawBody);
  const qstashValid = await verifyQStashSignature(request, body);
  if (!qstashValid) {
    return syncResult;
  }

  return {
    ...syncResult,
    authorized: true,
    qstashVerified: true,
  };
}
