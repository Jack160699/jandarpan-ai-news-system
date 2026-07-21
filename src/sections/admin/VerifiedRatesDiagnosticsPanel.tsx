import Link from "next/link";
import { FUEL_CITY_SLUGS } from "@/lib/verified-rates/catalog";
import { getHistoryDiagnostics } from "@/lib/verified-rates/repository";
import { snapshotsToPoints } from "@/lib/verified-rates/history";
import { availableRangesFromPoints } from "@/lib/verified-rates/movement";
import { fetchAcceptedSnapshots } from "@/lib/verified-rates/repository";
import { providerEligibilitySummary } from "@/lib/verified-rates/verify";
import { listSupportedRateRoutes } from "@/lib/verified-rates/catalog";

export async function VerifiedRatesDiagnosticsPanel() {
  const eligibility = providerEligibilitySummary();

  const fuelRows = await Promise.all(
    FUEL_CITY_SLUGS.flatMap((city) =>
      (["petrol", "diesel"] as const).map(async (category) => {
        const diag = await getHistoryDiagnostics({ category, citySlug: city });
        const snaps = await fetchAcceptedSnapshots({ category, citySlug: city, limit: 400 });
        const points = snapshotsToPoints(snaps);
        const ranges = availableRangesFromPoints(points);
        return {
          key: `${city}-${category}`,
          label: `${city} / ${category}`,
          diag,
          ranges,
          sitemap: true,
          indexable: true,
        };
      })
    )
  );

  const bullionRows = await Promise.all(
    (["gold_24k", "gold_22k", "silver_999"] as const).map(async (category) => {
      const diag = await getHistoryDiagnostics({ category, citySlug: null });
      const snaps = await fetchAcceptedSnapshots({ category, citySlug: null, limit: 400 });
      const points = snapshotsToPoints(snaps);
      return {
        key: category,
        label: category,
        diag,
        ranges: availableRangesFromPoints(points),
        sitemap: true,
        indexable: true,
      };
    })
  );

  const routeCount = listSupportedRateRoutes().filter((r) => r.indexable).length;

  return (
    <div className="av3-stack" style={{ display: "grid", gap: 16 }}>
      <section className="av3-panel">
        <h2 className="av3-panel-title">Provider gates</h2>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
          {JSON.stringify(eligibility, null, 2)}
        </pre>
        <p style={{ fontSize: 13 }}>
          Manual price entry is disabled. Rerun via cron{" "}
          <code>/api/cron/verified-rates</code> with CRON_SECRET.
        </p>
      </section>

      <section className="av3-panel">
        <h2 className="av3-panel-title">SEO / sitemap</h2>
        <ul>
          <li>Indexable rate routes: {routeCount}</li>
          <li>
            Sitemap: <Link href="/sitemap-rates.xml">/sitemap-rates.xml</Link>
          </li>
          <li>Seven-run stability: not claimed (providers gated)</li>
        </ul>
      </section>

      <section className="av3-panel">
        <h2 className="av3-panel-title">Fuel history</h2>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Series</th>
              <th align="left">Snapshots</th>
              <th align="left">First</th>
              <th align="left">Latest</th>
              <th align="left">Graph</th>
              <th align="left">Ranges</th>
              <th align="left">Dataset</th>
            </tr>
          </thead>
          <tbody>
            {fuelRows.map((r) => (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td>{r.diag.snapshotCount}</td>
                <td>{r.diag.firstAvailableDate ?? "—"}</td>
                <td>{r.diag.latestAvailableDate ?? "—"}</td>
                <td>{r.diag.graphEligible ? "yes" : "no"}</td>
                <td>{r.ranges.join(", ") || "—"}</td>
                <td>{r.diag.datasetExportEligible ? "eligible" : "collecting"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="av3-panel">
        <h2 className="av3-panel-title">Bullion history</h2>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Series</th>
              <th align="left">Snapshots</th>
              <th align="left">First</th>
              <th align="left">Latest</th>
              <th align="left">Graph</th>
              <th align="left">Ranges</th>
            </tr>
          </thead>
          <tbody>
            {bullionRows.map((r) => (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td>{r.diag.snapshotCount}</td>
                <td>{r.diag.firstAvailableDate ?? "—"}</td>
                <td>{r.diag.latestAvailableDate ?? "—"}</td>
                <td>{r.diag.graphEligible ? "yes" : "no"}</td>
                <td>{r.ranges.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
