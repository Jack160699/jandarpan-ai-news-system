import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import sample from "@/lib/admin-ops/__fixtures__/snapshot.sample.json";
import { buildOpsView } from "@/lib/admin-ops/snapshot";
import type { OpsSnapshotRaw } from "@/lib/admin-ops/types";
import { OpsCommandCenter } from "@/components/admin-ops/OpsCommandCenter";

const snap = sample as unknown as OpsSnapshotRaw;
const view = buildOpsView(snap, { snapshotLatencyMs: 320, now: new Date(snap.generated_at).getTime() });

function render(props: { canRun: boolean; canViewUsers: boolean }) {
  return renderToStaticMarkup(createElement(OpsCommandCenter, { initial: view, ...props }));
}

describe("OpsCommandCenter (rendered from the real production snapshot)", () => {
  const html = render({ canRun: true, canViewUsers: true });

  it("renders the eight core KPIs with real values", () => {
    for (const label of [
      "Total users",
      "Active today",
      "Active · 7 days",
      "New users · 30 days",
      "Published today",
      "News signals today",
      "Pending editorial queue",
      "Freshness lag",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain(">7<"); // total users
    expect(html).toContain("1,005"); // events awaiting an article (en-IN grouping)
  });

  it("shows the stalled-pipeline banner and the TODAY progress against the daily target", () => {
    expect(html).toContain("Publishing pipeline stalled");
    expect(html).toContain("TODAY: 0 / 100");
    expect(html).toContain("critical");
  });

  it("renders every requested panel", () => {
    for (const title of [
      "News freshness",
      "Editorial pipeline funnel",
      "System health",
      "Run now",
      "Ingestion health",
      "Chhattisgarh geo coverage",
      "Language health",
      "Queue &amp; failure center",
      "Best performing articles",
      "AI provider health",
      "Scheduled jobs",
      "Users",
    ]) {
      expect(html).toContain(title);
    }
  });

  it("lists all twelve subsystems and the funnel stages", () => {
    for (const s of ["Database", "Ingestion", "NewsData", "RSS", "GNews", "Editorial AI", "Translation", "Images", "Caching", "Cron / scheduler", "Vercel", "Supabase"]) {
      expect(html).toContain(s);
    }
    for (const stage of ["Fetched", "Geo classified", "Clustered into events", "Editorial candidates", "AI generated", "QA passed", "Published"]) {
      expect(html).toContain(stage);
    }
  });

  it("labels the performance metric window and excludes non-article ids", () => {
    expect(html).toContain("Metric window: last 24 hours");
    expect(html).toContain("28 non-article ids");
  });

  it("hides the Users panel and disables run buttons without permission", () => {
    const limited = render({ canRun: false, canViewUsers: false });
    expect(limited).not.toContain("Search email");
    expect(limited).toContain("Not permitted");
    expect(html).toContain("Search email");
  });

  it("never leaks secrets or service keys into the markup", () => {
    expect(html).not.toMatch(/service_role|SUPABASE_SERVICE|CRON_SECRET|Bearer /i);
  });
});
