import { createHash } from "node:crypto";

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return request.headers.get("x-real-ip")?.trim() ?? null;
}

export function getUserAgent(request: Request): string | null {
  return request.headers.get("user-agent")?.slice(0, 512) ?? null;
}

export function deviceFingerprint(request: Request): string {
  const ua = getUserAgent(request) ?? "";
  const lang = request.headers.get("accept-language") ?? "";
  const raw = `${ua}|${lang}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
