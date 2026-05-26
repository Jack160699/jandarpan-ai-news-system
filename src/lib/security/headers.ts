/**
 * Security headers & Content-Security-Policy for Jan Darpan OS
 */

const SUPABASE_HOST = "*.supabase.co";

export function buildContentSecurityPolicy(nonce?: string): string {
  const scriptSrc = nonce
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `'self' 'unsafe-inline' 'unsafe-eval'`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https: ${SUPABASE_HOST}`,
    "font-src 'self' data:",
    `connect-src 'self' https: wss: ${SUPABASE_HOST}`,
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function securityHeaders(): Record<string, string> {
  const isProd = process.env.NODE_ENV === "production";

  const headers: Record<string, string> = {
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "X-DNS-Prefetch-Control": "on",
    "Content-Security-Policy": buildContentSecurityPolicy(),
  };

  if (isProd) {
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
  }

  return headers;
}
