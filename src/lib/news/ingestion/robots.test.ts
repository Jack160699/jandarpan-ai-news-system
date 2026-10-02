import { beforeEach, describe, expect, it } from "vitest";
import { clearRobotsCache, isFetchAllowed, isPathAllowed, parseRobots, ROBOTS_PRODUCT_TOKEN } from "./robots";

const txt = (s: string) => parseRobots(s, ROBOTS_PRODUCT_TOKEN);

describe("parseRobots / isPathAllowed", () => {
  it("allows everything when nothing is disallowed", () => {
    expect(isPathAllowed(txt("User-agent: *\nAllow: /"), "/news/a")).toBe(true);
    expect(isPathAllowed(txt("User-agent: *\nDisallow:"), "/news/a")).toBe(true);
  });

  it("applies Disallow prefixes, with the longest match winning and Allow beating Disallow on a tie", () => {
    const r = txt("User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\nDisallow: /search");
    expect(isPathAllowed(r, "/wp-admin/options.php")).toBe(false);
    expect(isPathAllowed(r, "/wp-admin/admin-ajax.php")).toBe(true);
    expect(isPathAllowed(r, "/search?q=x")).toBe(false);
    expect(isPathAllowed(r, "/story-1")).toBe(true);
    const tie = txt("User-agent: *\nDisallow: /a\nAllow: /a");
    expect(isPathAllowed(tie, "/a/b")).toBe(true);
  });

  it("supports * wildcards and the $ end anchor", () => {
    const r = txt("User-agent: *\nDisallow: /*?utm_*\nDisallow: /*.pdf$");
    expect(isPathAllowed(r, "/story?utm_source=x")).toBe(false);
    expect(isPathAllowed(r, "/file.pdf")).toBe(false);
    expect(isPathAllowed(r, "/file.pdf.html")).toBe(true);
  });

  it("prefers the group for our product token over *", () => {
    const body = "User-agent: *\nDisallow: /\n\nUser-agent: Jan-Darpan-Chhattisgarh-RSS\nDisallow: /private";
    const r = txt(body);
    expect(isPathAllowed(r, "/news/x")).toBe(true);
    expect(isPathAllowed(r, "/private/x")).toBe(false);
  });

  it("merges stacked user-agent lines into one group and ignores comments", () => {
    const r = txt("User-agent: googlebot\nUser-agent: *\n# comment\nDisallow: /x # trailing\nCrawl-delay: 5");
    expect(isPathAllowed(r, "/x/y")).toBe(false);
    expect(r.crawlDelay).toBe(5);
  });
});

describe("isFetchAllowed (fetching robots.txt)", () => {
  beforeEach(() => clearRobotsCache());
  const res = (status: number, body = "") => ({ ok: status >= 200 && status < 300, status, text: async () => body }) as Response;
  const opts = (impl: () => Promise<Response>) => ({ userAgent: "Jan-Darpan-Chhattisgarh-RSS/2.1", fetchImpl: (async () => impl()) as typeof fetch });

  it("honours Disallow rules fetched from the host", async () => {
    const o = opts(async () => res(200, "User-agent: *\nDisallow: /private/"));
    expect(await isFetchAllowed("https://pub.test/news/a", o)).toBe(true);
    expect(await isFetchAllowed("https://pub.test/private/a", o)).toBe(false);
  });

  it("treats a missing robots.txt (404) as allow-all, but 403/5xx/network errors as NOT allowed", async () => {
    expect(await isFetchAllowed("https://a.test/x", opts(async () => res(404)))).toBe(true);
    expect(await isFetchAllowed("https://b.test/x", opts(async () => res(403)))).toBe(false);
    expect(await isFetchAllowed("https://c.test/x", opts(async () => res(503)))).toBe(false);
    expect(await isFetchAllowed("https://d.test/x", opts(async () => { throw new Error("boom"); }))).toBe(false);
  });

  it("asks each host once (cached) and rejects non-http URLs", async () => {
    let calls = 0;
    const o = opts(async () => { calls++; return res(200, "User-agent: *\nAllow: /"); });
    await isFetchAllowed("https://e.test/1", o);
    await isFetchAllowed("https://e.test/2", o);
    expect(calls).toBe(1);
    expect(await isFetchAllowed("ftp://e.test/1", o)).toBe(false);
    expect(await isFetchAllowed("not a url", o)).toBe(false);
  });
});
