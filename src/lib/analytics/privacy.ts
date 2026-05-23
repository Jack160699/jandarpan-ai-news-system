/**
 * Privacy-aware analytics — no PII, DNT respect, anonymous sessions
 */

const SESSION_KEY = "nr-analytics-session";

export function analyticsOptedOut(): boolean {
  if (typeof navigator === "undefined") return false;
  const dnt = navigator.doNotTrack;
  return dnt === "1" || dnt === "yes";
}

export function getAnonymousSessionHash(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export function sanitizeEventMetadata(
  meta?: Record<string, unknown>
): Record<string, unknown> {
  if (!meta) return {};
  const blocked = new Set([
    "email",
    "userId",
    "user_id",
    "ip",
    "name",
    "phone",
  ]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (blocked.has(k.toLowerCase())) continue;
    if (typeof v === "string" && v.includes("@")) continue;
    out[k] = v;
  }
  return out;
}
