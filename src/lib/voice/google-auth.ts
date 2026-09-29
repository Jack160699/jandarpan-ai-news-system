/**
 * Google Cloud authentication for server-side TTS.
 *
 * Credentials come ONLY from environment variables (never source, never the browser):
 *   GOOGLE_TTS_SERVICE_ACCOUNT_JSON   service-account key JSON (raw JSON or base64) for the GCP
 *                                     project that carries the billing/credit account
 *   GOOGLE_CLOUD_PROJECT              optional; sent as x-goog-user-project for quota/billing attribution
 *
 * A dedicated variable is used on purpose: GSC_SERVICE_ACCOUNT_JSON belongs to Search Console and may
 * live in a different project than the credits. Access tokens are cached in memory until shortly
 * before expiry. Secrets are never logged.
 */

import { createSign } from "node:crypto";

export type ServiceAccount = { client_email: string; private_key: string; project_id?: string };

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/cloud-platform";

type Env = Record<string, string | undefined>;

export function parseServiceAccount(raw: string | undefined): ServiceAccount | null {
  if (!raw?.trim()) return null;
  const candidates = [raw.trim()];
  try {
    candidates.push(Buffer.from(raw.trim(), "base64").toString("utf8"));
  } catch {
    /* not base64 */
  }
  for (const c of candidates) {
    try {
      const j = JSON.parse(c) as Partial<ServiceAccount>;
      if (typeof j.client_email === "string" && typeof j.private_key === "string") {
        return { client_email: j.client_email, private_key: j.private_key.replace(/\\n/g, "\n"), project_id: j.project_id };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

export function googleTtsConfigured(env: Env = process.env): boolean {
  return parseServiceAccount(env.GOOGLE_TTS_SERVICE_ACCOUNT_JSON) !== null;
}

export function googleProjectId(env: Env = process.env): string | null {
  return (
    env.GOOGLE_CLOUD_PROJECT?.trim() ||
    parseServiceAccount(env.GOOGLE_TTS_SERVICE_ACCOUNT_JSON)?.project_id ||
    null
  );
}

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");

export function signServiceAccountJwt(sa: ServiceAccount, nowSec: number): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: nowSec, exp: nowSec + 3600 })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(sa.private_key);
  return `${header}.${claims}.${b64url(signature)}`;
}

let cached: { token: string; expiresAt: number; key: string } | null = null;

export class GoogleAuthError extends Error {
  constructor(
    message: string,
    readonly kind: "not_configured" | "unauthorized" | "network"
  ) {
    super(message);
  }
}

export async function getGoogleAccessToken(
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now
): Promise<string> {
  const sa = parseServiceAccount(env.GOOGLE_TTS_SERVICE_ACCOUNT_JSON);
  if (!sa) throw new GoogleAuthError("GOOGLE_TTS_SERVICE_ACCOUNT_JSON is not configured", "not_configured");

  if (cached && cached.key === sa.client_email && cached.expiresAt - 60_000 > now()) return cached.token;

  const assertion = signServiceAccountJwt(sa, Math.floor(now() / 1000));
  let res: Response;
  try {
    res = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    throw new GoogleAuthError(`token endpoint unreachable: ${err instanceof Error ? err.message : "error"}`, "network");
  }
  if (!res.ok) {
    // Body may echo request details; report status only.
    throw new GoogleAuthError(`token exchange failed (HTTP ${res.status})`, "unauthorized");
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new GoogleAuthError("token response had no access_token", "unauthorized");
  cached = {
    token: json.access_token,
    expiresAt: now() + (json.expires_in ?? 3600) * 1000,
    key: sa.client_email,
  };
  return cached.token;
}

/** Test helper. */
export function resetGoogleTokenCache(): void {
  cached = null;
}
