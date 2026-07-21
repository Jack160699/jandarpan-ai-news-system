/**
 * Safe image-proxy URL validation — allowlist only, no open SSRF proxy.
 * Use before any future proxy route; never fetch arbitrary user URLs.
 */

import {
  isTrustedImageUrl,
  isExpiredSignedUrl,
  isSupabaseSignedUrl,
} from "@/lib/news/images/trusted-remote-hosts";
import { validateImageUrlShape } from "@/lib/news/images/image-url-validation";
import { isRejectedImageUrl } from "@/lib/news/images/validate";

export type ImageProxyValidation = {
  ok: boolean;
  reason?: string;
};

const BLOCKED_HOST_RE =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[::1\]|metadata\.google)/i;

/**
 * Validate a candidate URL for optional controlled image proxying.
 * Rejects private networks, non-HTTPS, untrusted hosts, rejected assets.
 */
export function validateImageProxyTarget(url: string): ImageProxyValidation {
  const shape = validateImageUrlShape(url);
  if (!shape.ok) return { ok: false, reason: shape.reason };

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return { ok: false, reason: "malformed_url" };
  }

  if (BLOCKED_HOST_RE.test(hostname)) {
    return { ok: false, reason: "private_or_metadata_host" };
  }

  if (!isTrustedImageUrl(url)) {
    return { ok: false, reason: "untrusted_host" };
  }

  if (isSupabaseSignedUrl(url) && isExpiredSignedUrl(url)) {
    return { ok: false, reason: "expired_signed_url" };
  }

  const rejected = isRejectedImageUrl(url);
  if (rejected.rejected) {
    return { ok: false, reason: rejected.reason };
  }

  return { ok: true };
}
