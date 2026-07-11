/**
 * Competitor Intelligence — polite robots.txt gate (best-effort)
 */

import { COMPETITOR_FETCH_TIMEOUT_MS, COMPETITOR_USER_AGENT } from "@/lib/competitor-intelligence/config";

const robotsCache = new Map<string, { rules: string; expiresAt: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function parseRobotsDisallow(body: string, userAgent: string): string[] {
  const lines = body.split(/\r?\n/);
  const disallow: string[] = [];
  let applies = false;

  for (const raw of lines) {
    const line = raw.split("#")[0]?.trim() ?? "";
    if (!line) continue;

    const agentMatch = line.match(/^user-agent:\s*(.+)$/i);
    if (agentMatch) {
      const agent = agentMatch[1].trim().toLowerCase();
      applies = agent === "*" || userAgent.toLowerCase().includes(agent);
      continue;
    }

    if (!applies) continue;
    const disallowMatch = line.match(/^disallow:\s*(.*)$/i);
    if (disallowMatch) {
      const path = disallowMatch[1].trim();
      if (path) disallow.push(path);
    }
  }

  return disallow;
}

async function fetchRobotsTxt(origin: string): Promise<string | null> {
  const cached = robotsCache.get(origin);
  if (cached && cached.expiresAt > Date.now()) return cached.rules;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COMPETITOR_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${origin}/robots.txt`, {
      signal: controller.signal,
      headers: { "User-Agent": COMPETITOR_USER_AGENT, Accept: "text/plain" },
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const rules = await res.text();
    robotsCache.set(origin, { rules, expiresAt: Date.now() + CACHE_TTL_MS });
    return rules;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export async function isUrlAllowedByRobots(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const rules = await fetchRobotsTxt(parsed.origin);
    if (!rules) return true;

    const disallow = parseRobotsDisallow(rules, COMPETITOR_USER_AGENT);
    const path = `${parsed.pathname}${parsed.search}`;

    return !disallow.some((rule) => rule !== "/" && path.startsWith(rule));
  } catch {
    return true;
  }
}

export function clearRobotsCacheForTests(): void {
  robotsCache.clear();
}
