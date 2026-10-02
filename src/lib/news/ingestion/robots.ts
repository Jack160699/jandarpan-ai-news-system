/**
 * robots.txt compliance for publisher page fetches (source-text enrichment, layer B).
 *
 * Rules implemented (RFC 9309 semantics):
 *   - the most specific user-agent group wins (our product token, else "*"); groups are merged per token
 *   - longest matching path pattern wins; on a tie Allow beats Disallow
 *   - "*" matches any run of characters, a trailing "$" anchors the end
 *   - robots.txt 404/410 (no file) = everything allowed; 5xx, timeouts or network errors = NOT allowed (fail closed)
 *   - results are cached per host so a run asks each publisher once
 * Pure parsing/matching (parseRobots / isPathAllowed) is separated from the fetch for unit tests.
 */

export const ROBOTS_PRODUCT_TOKEN = "jan-darpan-chhattisgarh-rss";

export type RobotsRules = {
  allow: string[];
  disallow: string[];
  /** seconds, informational: callers keep their own politeness delay */
  crawlDelay: number | null;
};

export function parseRobots(text: string, productToken: string = ROBOTS_PRODUCT_TOKEN): RobotsRules {
  type Group = { agents: string[]; allow: string[]; disallow: string[]; crawlDelay: number | null };
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], allow: [], disallow: [], crawlDelay: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "allow" && value) current.allow.push(value);
    else if (key === "disallow" && value) current.disallow.push(value);
    else if (key === "crawl-delay") {
      const n = Number(value);
      if (Number.isFinite(n)) current.crawlDelay = n;
    }
  }

  const token = productToken.toLowerCase();
  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && token.includes(a)));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  return {
    allow: chosen.flatMap((g) => g.allow),
    disallow: chosen.flatMap((g) => g.disallow),
    crawlDelay: chosen.map((g) => g.crawlDelay).find((d) => d !== null) ?? null,
  };
}

function patternToRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

export function isPathAllowed(rules: RobotsRules, pathWithQuery: string): boolean {
  let bestAllow = -1;
  let bestDisallow = -1;
  for (const p of rules.allow) if (patternToRegExp(p).test(pathWithQuery)) bestAllow = Math.max(bestAllow, p.length);
  for (const p of rules.disallow) if (patternToRegExp(p).test(pathWithQuery)) bestDisallow = Math.max(bestDisallow, p.length);
  if (bestDisallow < 0) return true;
  return bestAllow >= bestDisallow;
}

type CacheEntry = { at: number; rules: RobotsRules | "deny_all" | "allow_all" };
const CACHE_TTL_MS = 30 * 60_000;
const cache = new Map<string, CacheEntry>();

/** Test hook. */
export function clearRobotsCache(): void {
  cache.clear();
}

export async function isFetchAllowed(
  url: string,
  options: { userAgent: string; fetchImpl?: typeof fetch; timeoutMs?: number; now?: number } = { userAgent: ROBOTS_PRODUCT_TOKEN }
): Promise<boolean> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return false;
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") return false;

  const now = options.now ?? Date.now();
  const host = target.host;
  let entry = cache.get(host);
  if (!entry || now - entry.at > CACHE_TTL_MS) {
    entry = { at: now, rules: await loadRules(target, options) };
    cache.set(host, entry);
  }
  if (entry.rules === "deny_all") return false;
  if (entry.rules === "allow_all") return true;
  return isPathAllowed(entry.rules, `${target.pathname}${target.search}`);
}

async function loadRules(
  target: URL,
  options: { userAgent: string; fetchImpl?: typeof fetch; timeoutMs?: number }
): Promise<RobotsRules | "deny_all" | "allow_all"> {
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 6_000);
  try {
    const res = await doFetch(`${target.protocol}//${target.host}/robots.txt`, {
      headers: { "User-Agent": options.userAgent, Accept: "text/plain,*/*" },
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
    });
    if (res.status === 404 || res.status === 410) return "allow_all";
    if (!res.ok) return "deny_all"; // 401/403/5xx: cannot establish permission -> do not fetch
    const body = await res.text();
    if (/<html[\s>]/i.test(body.slice(0, 500))) return "allow_all"; // soft-404 HTML page: no robots file exists
    return parseRobots(body);
  } catch {
    return "deny_all";
  } finally {
    clearTimeout(timer);
  }
}
