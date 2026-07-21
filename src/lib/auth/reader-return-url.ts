/**
 * Safe reader post-auth return URL validation.
 * Prevents open redirects while allowing in-app deep links.
 */

const BLOCKED_PATH_PREFIXES = ["/admin", "/dashboard", "/api", "/auth/callback"];

/**
 * Returns a same-origin relative path suitable for post-login redirect,
 * or `fallback` when the candidate is unsafe / external.
 */
export function sanitizeReaderReturnUrl(
  candidate: string | null | undefined,
  fallback = "/archive"
): string {
  if (!candidate) return fallback;

  let decoded = candidate.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return fallback;
  }

  if (!decoded.startsWith("/")) return fallback;
  if (decoded.startsWith("//")) return fallback;
  if (decoded.includes("://")) return fallback;
  if (decoded.includes("\\")) return fallback;
  if (/[\r\n\0]/.test(decoded)) return fallback;
  if (decoded.length > 512) return fallback;

  const pathOnly = decoded.split("?")[0]?.split("#")[0] ?? decoded;
  for (const prefix of BLOCKED_PATH_PREFIXES) {
    if (pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)) {
      return fallback;
    }
  }

  return decoded;
}

/** True when a non-empty next/return param would be rejected. */
export function isRejectedReaderReturnUrl(
  candidate: string | null | undefined
): boolean {
  if (!candidate?.trim()) return false;
  const sentinel = "/__reader_safe_fallback__";
  return sanitizeReaderReturnUrl(candidate, sentinel) === sentinel;
}

/**
 * Build OAuth redirectTo pointing at the app callback with optional safe next.
 */
export function buildReaderOAuthRedirectTo(
  origin: string,
  next?: string | null
): string {
  const safeNext = sanitizeReaderReturnUrl(next, "/archive");
  const url = new URL("/auth/callback", origin);
  if (safeNext !== "/archive") {
    url.searchParams.set("next", safeNext);
  }
  return url.toString();
}
