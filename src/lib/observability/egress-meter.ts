/**
 * Opt-in Supabase egress meter (JD_EGRESS_METER=true).
 *
 * The project is cut off when its monthly egress passes the Free-plan allowance, and the Supabase dashboard only shows totals
 * after the fact. This wraps the service-role client's fetch and counts, per run, how many requests went out and how many
 * response bytes came back, broken down by table / RPC. Workers add the snapshot to their run metadata
 * (cron_runs.metadata.egress), so the real per-run cost of fetch / cluster / editorial / translation is visible within minutes of
 * resuming -- and the model in docs/jandarpan-egress-budget.md can be corrected against measurements instead of estimates.
 *
 * Off by default (it clones each response to measure its decoded size). Counts decoded JSON bytes (an upper bound on what is
 * billed when the transport compresses). Never records URLs' query strings, headers, keys or bodies.
 */

type Bucket = { requests: number; bytes: number };

const buckets = new Map<string, Bucket>();
let totalRequests = 0;
let totalBytes = 0;

export function egressMeterEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.JD_EGRESS_METER?.trim().toLowerCase() === "true";
}

export function resetEgress(): void {
  buckets.clear();
  totalRequests = 0;
  totalBytes = 0;
}

/** "https://x.supabase.co/rest/v1/news_events?select=..." -> "news_events"; ".../rest/v1/rpc/fn" -> "rpc/fn"; other services by prefix. */
export function routeKey(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const m = /^\/(rest|auth|storage|functions|realtime)\/v1\/([^/?]+(?:\/[^/?]+)?)/.exec(u.pathname);
    if (!m) return u.pathname.split("/").slice(0, 3).join("/") || "other";
    if (m[1] === "rest") return m[2]!.startsWith("rpc/") ? m[2]! : m[2]!.split("/")[0]!;
    return `${m[1]}:${m[2]!.split("/")[0]}`;
  } catch {
    return "other";
  }
}

function record(key: string, bytes: number): void {
  const b = buckets.get(key) ?? { requests: 0, bytes: 0 };
  b.requests += 1;
  b.bytes += bytes;
  buckets.set(key, b);
  totalRequests += 1;
  totalBytes += bytes;
}

export function meteredFetch(inner: typeof fetch): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await inner(input, init);
    try {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      const key = routeKey(url);
      const declared = Number(res.headers.get("content-length"));
      if (!res.headers.get("content-encoding") && Number.isFinite(declared) && declared > 0) {
        record(key, declared);
      } else {
        record(key, (await res.clone().arrayBuffer()).byteLength);
      }
    } catch {
      /* metering must never break a request */
    }
    return res;
  }) as typeof fetch;
}

export type EgressSnapshot = {
  requests: number;
  bytes: number;
  kb: number;
  top: Array<{ route: string; requests: number; kb: number }>;
};

export function snapshotEgress(topN = 8): EgressSnapshot {
  const top = [...buckets.entries()]
    .sort((a, b) => b[1].bytes - a[1].bytes)
    .slice(0, topN)
    .map(([route, v]) => ({ route, requests: v.requests, kb: Math.round(v.bytes / 102.4) / 10 }));
  return { requests: totalRequests, bytes: totalBytes, kb: Math.round(totalBytes / 102.4) / 10, top };
}
