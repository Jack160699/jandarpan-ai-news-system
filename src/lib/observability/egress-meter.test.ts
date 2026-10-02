import { beforeEach, describe, expect, it } from "vitest";
import { egressMeterEnabled, meteredFetch, resetEgress, routeKey, snapshotEgress } from "./egress-meter";

beforeEach(() => resetEgress());

const fakeFetch = (body: string, headers: Record<string, string> = {}) =>
  (async () => new Response(body, { status: 200, headers })) as unknown as typeof fetch;

describe("egress meter", () => {
  it("is off unless JD_EGRESS_METER=true", () => {
    expect(egressMeterEnabled({})).toBe(false);
    expect(egressMeterEnabled({ JD_EGRESS_METER: "true" })).toBe(true);
  });

  it("maps Supabase URLs to a table / rpc / service key without leaking query strings", () => {
    expect(routeKey("https://p.supabase.co/rest/v1/news_events?select=id&id=eq.secret")).toBe("news_events");
    expect(routeKey("https://p.supabase.co/rest/v1/rpc/jd_unclustered_signals")).toBe("rpc/jd_unclustered_signals");
    expect(routeKey("https://p.supabase.co/auth/v1/token?grant_type=password")).toBe("auth:token");
    expect(routeKey("https://p.supabase.co/storage/v1/object/public/editorial-images/a.jpg")).toBe("storage:object");
  });

  it("counts requests and decoded response bytes per route and returns the top spenders", async () => {
    const big = "x".repeat(5000);
    await meteredFetch(fakeFetch(big))("https://p.supabase.co/rest/v1/generated_articles?select=*");
    await meteredFetch(fakeFetch(big))("https://p.supabase.co/rest/v1/generated_articles?select=*");
    await meteredFetch(fakeFetch("ok"))("https://p.supabase.co/rest/v1/worker_jobs?select=id");
    const snap = snapshotEgress();
    expect(snap.requests).toBe(3);
    expect(snap.bytes).toBe(10_002);
    expect(snap.top[0]).toMatchObject({ route: "generated_articles", requests: 2 });
    expect(JSON.stringify(snap)).not.toContain("select");
  });

  it("never alters the response and never throws on metering errors", async () => {
    const res = await meteredFetch(fakeFetch('{"a":1}'))("https://p.supabase.co/rest/v1/t");
    expect(await res.json()).toEqual({ a: 1 });
  });

  it("reset clears the counters", async () => {
    await meteredFetch(fakeFetch("abc"))("https://p.supabase.co/rest/v1/t");
    resetEgress();
    expect(snapshotEgress()).toMatchObject({ requests: 0, bytes: 0, top: [] });
  });
});
