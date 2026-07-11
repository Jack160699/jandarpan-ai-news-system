/**
 * Google Search Console API — authentication (service account JWT or OAuth refresh)
 */

import { createSign } from "crypto";
import { GSC_SCOPE } from "@/lib/gsc-intelligence/config";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

interface ServiceAccountJson {
  client_email: string;
  private_key: string;
}

function parseServiceAccountJson(): ServiceAccountJson | null {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const json = JSON.parse(raw) as ServiceAccountJson;
    if (!json.client_email || !json.private_key) return null;
    return json;
  } catch {
    return null;
  }
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

async function getTokenFromServiceAccount(
  account: ServiceAccountJson
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: GSC_SCOPE,
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now,
    })
  );

  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(account.private_key, "base64url");
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    throw new Error(`gsc_service_account_token_${res.status}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("gsc_no_access_token");
  return data.access_token;
}

async function getTokenFromRefreshToken(): Promise<string> {
  const refreshToken = process.env.GSC_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error("gsc_oauth_not_configured");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`gsc_refresh_token_${res.status}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("gsc_no_access_token");
  return data.access_token;
}

export async function getGscAccessToken(): Promise<string> {
  const account = parseServiceAccountJson();
  if (account) return getTokenFromServiceAccount(account);
  return getTokenFromRefreshToken();
}
