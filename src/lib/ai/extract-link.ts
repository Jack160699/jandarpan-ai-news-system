import type { ExtractLinkResult } from "./types";

const EXTRACT_TIMEOUT_MS = 22_000;
const MAX_TEXT_CHARS = 12_000;

function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function stripBoilerplate(text: string): string {
  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*Share this.*$/gim, "")
    .replace(/^\s*Advertisement\s*$/gim, "")
    .replace(/^\s*Also read:.*$/gim, "")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

async function extractViaJina(url: string): Promise<{ title: string; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);

  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "text/plain",
        "X-Return-Format": "markdown",
      },
    });

    if (!res.ok) {
      throw new Error(`jina_http_${res.status}`);
    }

    const raw = await res.text();
    const titleMatch = raw.match(/^Title:\s*(.+)$/m);
    const title = titleMatch?.[1]?.trim() ?? "";
    const body = raw.replace(/^Title:.*$/m, "").replace(/^URL Source:.*$/m, "").trim();
    const text = stripBoilerplate(body);

    if (text.length < 120) {
      throw new Error("jina_text_too_short");
    }

    return { title, text };
  } finally {
    clearTimeout(timeout);
  }
}

/** Minimal HTML text fallback — no extra dependencies. */
async function extractViaFetch(url: string): Promise<{ title: string; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "JanDarpanEditorBot/1.0 (+https://jandarpan.com; editorial-link-intake)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    if (!res.ok) throw new Error(`fetch_http_${res.status}`);
    const html = await res.text();
    const title =
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
    const text = stripBoilerplate(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
    );

    if (text.length < 120) throw new Error("fetch_text_too_short");
    return { title, text };
  } finally {
    clearTimeout(timeout);
  }
}

export async function extractLinkContent(rawUrl: string): Promise<ExtractLinkResult> {
  const url = normalizeUrl(rawUrl);
  if (!url) {
    return { ok: false, error: "invalid_url" };
  }

  try {
    const jina = await extractViaJina(url);
    return { ok: true, title: jina.title, text: jina.text, url };
  } catch {
    try {
      const fallback = await extractViaFetch(url);
      return { ok: true, title: fallback.title, text: fallback.text, url };
    } catch {
      return { ok: false, error: "extract_failed" };
    }
  }
}
