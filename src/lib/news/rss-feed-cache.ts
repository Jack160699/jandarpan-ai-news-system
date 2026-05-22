/**
 * RSS feed XML cache (per serverless invocation, 15 min TTL)
 */

type Entry = { xml: string; expiresAt: number };

const FEED_XML_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, Entry>();

export function getCachedFeedXml(url: string): string | undefined {
  const e = cache.get(url);
  if (!e || Date.now() > e.expiresAt) {
    cache.delete(url);
    return undefined;
  }
  return e.xml;
}

export function setCachedFeedXml(url: string, xml: string): void {
  if (cache.size > 200) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(url, { xml, expiresAt: Date.now() + FEED_XML_TTL_MS });
}
