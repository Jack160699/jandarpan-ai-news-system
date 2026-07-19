/**
 * Cron / worker route authentication
 *
 * Accepted credentials (any one):
 * - Authorization: Bearer <secret> (Vercel Cron, GitHub manual, QStash outbound)
 * - x-cron-secret: <secret>
 * - Upstash-Signature JWT (QStash primary scheduler)
 *
 * Secrets (least-privilege, backward compatible):
 * - CRON_SECRET — master fallback (all capabilities)
 * - CRON_API_SECRET — legacy master alias
 * - CRON_INGEST_SECRET, CRON_PIPELINE_SECRET, CRON_OPS_SECRET, CRON_ADMIN_SECRET — scoped
 * - ADMIN_SECRET — admin capability only (legacy)
 *
 * Vercel Cron (when CRON_SECRET is set) also sends x-vercel-cron: 1
 */

import { Receiver } from "@upstash/qstash";
import { isProductionDeployment } from "@/lib/infrastructure/production";

export type CronCapability = "ingest" | "pipeline" | "ops" | "admin";

export type CronAuthResult = {
  authorized: boolean;
  bearerToken: string | null;
  cronHeader: string | null;
  vercelCron: boolean;
  expectedSecretEnv: string | null;
  qstashVerified?: boolean;
  capability?: CronCapability;
};

export type VerifyCronRequestOptions = {
  /** Raw request body — required when the route reads the body after auth (e.g. orchestrate). */
  rawBody?: string | null;
  /** Optional capability scope — accepts master + scoped secret for that capability. */
  capability?: CronCapability;
};

const CAPABILITY_ENV_KEYS: Record<CronCapability, string> = {
  ingest: "CRON_INGEST_SECRET",
  pipeline: "CRON_PIPELINE_SECRET",
  ops: "CRON_OPS_SECRET",
  admin: "CRON_ADMIN_SECRET",
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
  const legacy = process.env.CRON_API_SECRET?.trim();
  if (legacy) return { secret: legacy, env: "CRON_API_SECRET" };
  return { secret: null, env: null };
}

/** Exported for tests — never log return values. */
export function collectAcceptedSecrets(capability?: CronCapability): string[] {
  const secrets = new Set<string>();

  const master = process.env.CRON_SECRET?.trim();
  if (master) secrets.add(master);

  const legacyApi = process.env.CRON_API_SECRET?.trim();
  if (legacyApi) secrets.add(legacyApi);

  if (capability) {
    const scoped = process.env[CAPABILITY_ENV_KEYS[capability]]?.trim();
    if (scoped) secrets.add(scoped);
  }

  if (capability === "admin") {
    const adminSecret = process.env.ADMIN_SECRET?.trim();
    if (adminSecret) secrets.add(adminSecret);
  }

  return [...secrets];
}

/** Which env keys contribute secrets for a capability (names only). */
export function cronSecretEnvKeysForCapability(
  capability?: CronCapability
): string[] {
  const keys = ["CRON_SECRET", "CRON_API_SECRET"];
  if (capability) keys.push(CAPABILITY_ENV_KEYS[capability]);
  if (capability === "admin") keys.push("ADMIN_SECRET");
  return keys;
}

function matchesAcceptedSecret(
  bearerToken: string | null,
  cronHeader: string | null,
  accepted: string[]
): boolean {
  if (!accepted.length) return false;
  return accepted.some(
    (secret) => bearerToken === secret || cronHeader === secret
  );
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

function verifyCronSecret(
  request: Request,
  capability?: CronCapability
): CronAuthResult {
  const { env: expectedSecretEnv } = getCronSecret();
  const acceptedSecrets = collectAcceptedSecrets(capability);
  const authHeader = request.headers.get("authorization");
  const bearerToken = parseBearerToken(authHeader);
  const cronHeader = request.headers.get("x-cron-secret")?.trim() ?? null;
  const vercelCron = request.headers.get("x-vercel-cron") === "1";

  if (matchesAcceptedSecret(bearerToken, cronHeader, acceptedSecrets)) {
    return {
      authorized: true,
      bearerToken,
      cronHeader,
      vercelCron,
      expectedSecretEnv,
      capability,
    };
  }

  try {
    console.warn(
      JSON.stringify({
        tag: "[cron-auth]",
        event: "auth_failed",
        authHeader: redactAuthHeader(authHeader),
        envLoaded: acceptedSecrets.length > 0,
        expectedSecretEnv,
        capability: capability ?? null,
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
      capability,
    };
  }

  if (process.env.NODE_ENV !== "production" && !acceptedSecrets.length) {
    console.warn(
      "[cron-auth] No cron secrets configured — allowing unauthenticated cron in local dev only"
    );
    return {
      authorized: true,
      bearerToken,
      cronHeader,
      vercelCron,
      expectedSecretEnv,
      capability,
    };
  }

  return {
    authorized: false,
    bearerToken,
    cronHeader,
    vercelCron,
    expectedSecretEnv,
    capability,
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
  const capability = options?.capability;
  const syncResult = verifyCronSecret(request, capability);
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
