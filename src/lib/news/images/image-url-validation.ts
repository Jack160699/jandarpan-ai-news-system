/**
 * Sync + async public image URL validation.
 * Async path accepts injectable fetch for unit tests.
 */

export type ImageUrlShapeResult = {
  ok: boolean;
  reason?: string;
};

const HTML_EXTENSIONS = /\.(html?|php|aspx?)(\?|$)/i;
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|$)/i;

/** Sync: must be https with a host; reject obvious HTML pages. */
export function validateImageUrlShape(url: string): ImageUrlShapeResult {
  if (!url || typeof url !== "string") {
    return { ok: false, reason: "empty" };
  }
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "https_required" };
  }
  if (!parsed.hostname || parsed.hostname.length < 3) {
    return { ok: false, reason: "host_required" };
  }
  if (HTML_EXTENSIONS.test(parsed.pathname)) {
    return { ok: false, reason: "html_path" };
  }
  return { ok: true };
}

/** Soft heuristic — true when path looks like an image asset. */
export function looksLikeImagePath(url: string): boolean {
  try {
    const parsed = new URL(url);
    return IMAGE_EXTENSIONS.test(parsed.pathname);
  } catch {
    return false;
  }
}

export type ValidatePublicImageUrlOptions = {
  fetchImpl?: typeof fetch;
  minBytes?: number;
  timeoutMs?: number;
};

export type PublicImageValidation = {
  ok: boolean;
  reason?: string;
  contentType?: string | null;
  contentLength?: number | null;
  status?: number;
};

const DEFAULT_MIN_BYTES = 512;

/**
 * HEAD then optional GET. Injectable fetch for tests.
 * Skips network when fetchImpl is a stub that returns canned responses.
 */
export async function validatePublicImageUrl(
  url: string,
  options: ValidatePublicImageUrlOptions = {}
): Promise<PublicImageValidation> {
  const shape = validateImageUrlShape(url);
  if (!shape.ok) {
    return { ok: false, reason: shape.reason };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const minBytes = options.minBytes ?? DEFAULT_MIN_BYTES;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 8000
  );

  try {
    let res = await fetchImpl(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });

    // Some CDNs reject HEAD — fall back to GET
    if (res.status === 405 || res.status === 403) {
      res = await fetchImpl(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { Range: "bytes=0-1023" },
      });
    }

    const contentType = res.headers.get("content-type");
    const lengthHeader = res.headers.get("content-length");
    const contentLength = lengthHeader ? Number(lengthHeader) : null;

    if (!res.ok && res.status !== 206) {
      return {
        ok: false,
        reason: `http_${res.status}`,
        status: res.status,
        contentType,
        contentLength,
      };
    }

    if (contentType && !contentType.toLowerCase().startsWith("image/")) {
      return {
        ok: false,
        reason: "not_image_mime",
        status: res.status,
        contentType,
        contentLength,
      };
    }

    if (contentLength != null && !Number.isNaN(contentLength) && contentLength < minBytes) {
      return {
        ok: false,
        reason: "too_small",
        status: res.status,
        contentType,
        contentLength,
      };
    }

    return {
      ok: true,
      status: res.status,
      contentType,
      contentLength,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    return { ok: false, reason: message };
  } finally {
    clearTimeout(timeout);
  }
}
