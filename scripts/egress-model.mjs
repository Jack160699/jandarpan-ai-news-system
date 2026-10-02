/**
 * Reproducible Supabase egress model for docs/jandarpan-egress-budget.md.   node scripts/egress-model.mjs
 *
 * UNITS: every size is decoded UTF-8 bytes of the JSON PostgREST returns (octet_length(to_json(row)::text); Hindi = 3 bytes/char).
 * Totals are DECIMAL gigabytes (1 GB = 1,000,000,000 bytes). "5 GB" is the Free-plan figure assumed throughout; the dashboard
 * decides what is billed (compressed or not). Nothing here is a billed number.
 *
 * Every input is tagged  M = measured (query + date in the document)   or   A = assumption/model (stated, not observed).
 */

const GB = 1e9;
const MB = 1e6;
const KB = 1e3;

// ---------------------------------------------------------------- measured inputs (2026-10-02 ~10:00 UTC) ----------------------------
const M = {
  // pg_stat_statements window
  statsResetUtc: "2026-09-18T19:10:13.127683Z",
  measuredAtUtc: "2026-10-02T10:02:32.888507Z",
  // calls per statement over that window (pg_stat_statements.calls)
  calls: { S1: 16222, S2: 5773, S3: 4671, S4: 8447, S5: 4243, S6: 1448, S7: 15313 },
  // bytes per row of each statement's own column list (octet_length(to_json(row)::text)), measured on the 94-100 rows that exist today
  bytesPerRow: { S1: 12992, S2: 15629, S3: 15058, S4: 11391, S5: 10927, S6: 6168, S7: 14510 },
  // generated_articles rows that existed at the end of each day Sep 18..Oct 1 (created / published), Oct 2 = 100 / 94
  articlesEod: [1, 6, 8, 8, 26, 39, 47, 56, 87, 88, 89, 94, 94, 100],
  publishedEod: [0, 1, 3, 3, 21, 34, 42, 51, 81, 82, 83, 88, 88, 94],
  articlesNow: 100,
  publishedNow: 94,
  shareOfEventsWithArticle: 0.0136, // 99 of 7,282 events
  eventRowBytes: 2094, // EVENT_SELECT row
  signalBytesBundle: 2500, // modeled signal row inside a bundle (A)
  // post-fix per-row / per-call sizes
  feedCardRow: 3674, // generated_articles_feed after migration 098
  feedFullRow: 6168, // generated_articles_feed_full (broadcast)
  districtLeanRow: 50,
  topicRow: 142,
  unclusteredRow: 1401,
  matcherRow: 993,
  slateBytes: 72_169, // jd_editorial_candidate_events at current data (41 rows)
  storyIndexRow: 522, // 498 measured + 24 B fingerprint that is not yet backfilled
  sourceStateFullRow: 760,
  sourceStatePollRow: 443,
  healthRow: 270,
};

const days = (a, b) => (Date.parse(b) - Date.parse(a)) / 86_400_000;
const WINDOW_DAYS = days(M.statsResetUtc, M.measuredAtUtc);

// ---------------------------------------------------------------- 1. historical reconstruction ---------------------------------------
// mean rows available per call under the assumption that calls were spread uniformly over the window (A).
const meanOf = (eod, last) => {
  const full = eod.length; // days Sep 18 .. Oct 1
  const partial = WINDOW_DAYS - full; // Oct 2 fraction
  return (eod.reduce((a, b) => a + b, 0) + last * partial) / WINDOW_DAYS;
};
const meanArticles = meanOf(M.articlesEod, M.articlesNow);
const meanPublished = meanOf(M.publishedEod, M.publishedNow);

const shapes = [
  { id: "S1", label: "list pool, base table, NO translations (limit>=80)", rowsNow: M.publishedNow, rowsMean: meanPublished },
  { id: "S2", label: "list pool, base table, WITH full translations", rowsNow: M.publishedNow, rowsMean: meanPublished },
  { id: "S3", label: "full-body list (refreshSnapshotFromDatabase, limit 120)", rowsNow: M.publishedNow, rowsMean: meanPublished },
  { id: "S4", label: "district hub counts (<=800 rows, whole editorial_metadata)", rowsNow: M.articlesNow, rowsMean: meanArticles },
  { id: "S5", label: "topic hub counts (<=400 rows, whole editorial_metadata)", rowsNow: M.articlesNow, rowsMean: meanArticles },
  { id: "S6", label: "feed-view list (translations incl. bodies)", rowsNow: M.publishedNow, rowsMean: meanPublished },
];
const hist = shapes.map((s) => {
  const upper = M.calls[s.id] * s.rowsNow * M.bytesPerRow[s.id];
  const central = M.calls[s.id] * s.rowsMean * M.bytesPerRow[s.id];
  return { ...s, calls: M.calls[s.id], bytesPerRow: M.bytesPerRow[s.id], upper, central };
});
// S7: event-bundle article read by event_id. A row only comes back for the ~1.4% of events that have an article.
const s7Low = M.calls.S7 * M.shareOfEventsWithArticle * M.bytesPerRow.S7;
const s7High = M.calls.S7 * 1.0 * M.bytesPerRow.S7;
const histUpper = hist.reduce((a, s) => a + s.upper, 0);
const histCentral = hist.reduce((a, s) => a + s.central, 0);

// ---------------------------------------------------------------- 2. post-fix monthly model --------------------------------------------
const DAYS = 30;
function scenario(name, o) {
  const fetchRun =
    (4.8 * M.sourceStatePollRow) + (4.8 * M.healthRow) + // shard gating read: 48 feeds / 10 shards (M row sizes x A count)
    (4.8 * M.sourceStateFullRow) + (4.8 * 0.3 * M.sourceStateFullRow) + // one full state read per source + CAS read for ~30% with new items (A)
    10_000 + 2_000 + 500; // early-dedup URL lookup, persist responses, queue-health counts (A)
  const clusterRun = Math.min(120, o.signalsPerDay / 144 + 1) * M.unclusteredRow + 100 * M.matcherRow + 10_000; // 10 KB merges (A)
  const editorialWake = M.slateBytes + 25_000 * o.busyShare; // slate (M) + per-attempt signal/media reads (A)
  const storyIndexReads = Math.min(o.wakes, o.storiesPerDay) * 150 * M.storyIndexRow; // DB read only after a story is persisted (Redis otherwise)
  const poolRefreshes = Math.min(48, 24 + o.storiesPerDay); // TTL 60 min backstop + purges debounced to 30 min (A)
  const rows = [
    ["fetch workers: 1,440 runs/day x ~" + Math.round(fetchRun / KB) + " KB", 1440 * fetchRun],
    ["cluster worker: 144 runs/day x ~" + Math.round(clusterRun / KB) + " KB", 144 * clusterRun],
    ["editorial slate+attempts: " + o.wakes + " wakes/day x ~" + Math.round(editorialWake / KB) + " KB", o.wakes * editorialWake],
    ["editorial story index: DB reads only after a publish (" + Math.min(o.wakes, o.storiesPerDay) + "/day x 150 rows)", storyIndexReads],
    ["translation worker: " + Math.round(Math.min(48, o.storiesPerDay)) + " busy runs/day x 120 KB", Math.min(48, o.storiesPerDay) * 120 * KB],
    ["site: list pool " + poolRefreshes + " refreshes/day x 160 rows x " + M.feedCardRow + " B", poolRefreshes * 160 * M.feedCardRow],
    ["site: broadcast pool 24/day x 60 rows x " + M.feedFullRow + " B", 24 * 60 * M.feedFullRow],
    ["site: district+topic counts 24/day x (800x50 + 400x142 B)", 24 * (800 * M.districtLeanRow + 400 * M.topicRow)],
    ["site: event bundles 1,124/day x (event row + 2 signals + 1.4% article)", 1124 * (M.eventRowBytes + 2 * M.signalBytesBundle + M.shareOfEventsWithArticle * M.bytesPerRow.S7)],
    ["site: story pages " + o.storyReads + " reads/day x 16 KB", o.storyReads * 16 * KB],
    ["admin + auth + storage (placeholder)", (0.15 * GB) / DAYS],
  ];
  const total = rows.reduce((a, [, v]) => a + v, 0) * DAYS;
  return { name, rows, total };
}
const scenarios = [
  scenario("A. current supply (~10 stories/day, ~600 signals/day), editorial every 5 min", { signalsPerDay: 600, wakes: 288, busyShare: 0.3, storiesPerDay: 10, storyReads: 120 }),
  scenario("B. 100 stories/day, four-district-first (~1,000 signals/day), editorial every 5 min", { signalsPerDay: 1000, wakes: 288, busyShare: 0.7, storiesPerDay: 100, storyReads: 600 }),
  scenario("C. as B, editorial every 10 min", { signalsPerDay: 1000, wakes: 144, busyShare: 0.7, storiesPerDay: 100, storyReads: 600 }),
];

// ---------------------------------------------------------------- output ---------------------------------------------------------------
const f = (n, d = 2) => (n / GB).toFixed(d);
console.log(`WINDOW  ${M.statsResetUtc} -> ${M.measuredAtUtc} = ${WINDOW_DAYS.toFixed(4)} days`);
console.log(`ROWS    mean generated_articles over window = ${meanArticles.toFixed(1)} (now ${M.articlesNow}); mean published = ${meanPublished.toFixed(1)} (now ${M.publishedNow})`);
console.log("\nHISTORICAL RECONSTRUCTION  (calls x rows x bytes/row; decimal GB over the window)");
for (const s of hist) console.log(`${s.id} ${s.label.padEnd(62)} calls ${String(s.calls).padStart(6)}  B/row ${String(s.bytesPerRow).padStart(6)}  upper(today's rows) ${f(s.upper).padStart(6)}  central(mean rows) ${f(s.central).padStart(6)}`);
console.log(`S7 event-bundle article rows: ${M.calls.S7} calls x ${M.bytesPerRow.S7} B x share-with-article(${(M.shareOfEventsWithArticle * 100).toFixed(2)}%) = ${f(s7Low, 3)} GB (low) .. ${f(s7High)} GB if every call returned an article (high)`);
console.log(`TOTAL S1-S6   upper ${f(histUpper)} GB   central ${f(histCentral)} GB   (per 30 days: upper ${f((histUpper * 30) / WINDOW_DAYS)}  central ${f((histCentral * 30) / WINDOW_DAYS)})`);
console.log("\nPOST-FIX MONTHLY MODEL (30 days)");
for (const s of scenarios) {
  console.log(`\n## ${s.name}`);
  for (const [k, v] of s.rows) console.log(`  ${k.padEnd(88)} ${f(v * DAYS).padStart(6)} GB/mo`);
  console.log(`  ${"TOTAL (decoded bytes)".padEnd(88)} ${f(s.total).padStart(6)} GB/mo  = ${((s.total / (5 * GB)) * 100).toFixed(0)}% of 5 GB | if 3x ${f(s.total / 3)} | if 4x ${f(s.total / 4)}`);
}
