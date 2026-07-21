#!/usr/bin/env node
/**
 * Poll Vercel for a Preview deployment matching an exact git commit SHA.
 *
 * Distinguishes Queued / Building / Ready / Error / Canceled / TIMEOUT.
 * Never treats a polling timeout as a product regression.
 *
 * Usage:
 *   node scripts/poll-vercel-preview-by-sha.mjs --sha 02c69d8 [--project newspaper-motion] [--timeout-ms 600000]
 *
 * Exit codes:
 *   0  Ready + SHA match
 *   2  Deployment Error / Canceled
 *   3  TIMEOUT (infrastructure) — Ready not observed in time
 *   4  Usage / API error
 */

const { execSync } = require("node:child_process");

function parseArgs(argv) {
  const out = {
    sha: "",
    project: "newspaper-motion",
    scope: "jack160699s-projects",
    timeoutMs: 10 * 60 * 1000,
    initialIntervalMs: 12_000,
    maxIntervalMs: 30_000,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sha") out.sha = String(argv[++i] || "").trim();
    else if (a === "--project") out.project = String(argv[++i] || "").trim();
    else if (a === "--scope") out.scope = String(argv[++i] || "").trim();
    else if (a === "--timeout-ms") out.timeoutMs = Number(argv[++i]);
  }
  return out;
}

function run(cmdline) {
  return execSync(cmdline, {
    encoding: "utf8",
    maxBuffer: 12 * 1024 * 1024,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function listDeployments(project, scope) {
  const raw = run(`npx vercel ls ${project} --scope ${scope}`);
  const lines = raw.split(/\r?\n/);
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const same = line.match(
      /(https:\/\/newspaper-motion-[a-z0-9]+-jack160699s-projects\.vercel\.app)\s+●\s+(Queued|Building|Ready|Error|Canceled|Cancelled)/i
    );
    if (same) {
      rows.push({
        url: same[1],
        state: same[2].replace(/Cancelled/i, "Canceled"),
      });
      continue;
    }
    const urlOnly = line.match(
      /(https:\/\/newspaper-motion-[a-z0-9]+-jack160699s-projects\.vercel\.app)/i
    );
    if (!urlOnly) continue;
    const next = `${lines[i + 1] || ""} ${lines[i + 2] || ""}`;
    const st = next.match(/●\s+(Queued|Building|Ready|Error|Canceled|Cancelled)/i);
    rows.push({
      url: urlOnly[1],
      state: (st?.[1] || "UNKNOWN").replace(/Cancelled/i, "Canceled"),
    });
  }
  // Prefer table rows (with known state) before bare URL dump duplicates
  const seen = new Set();
  return rows.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

function inspectDeployment(hostOrId, scope) {
  const key = String(hostOrId).replace(/^https?:\/\//, "");
  const raw = run(`npx vercel api "/v13/deployments/${encodeURIComponent(key)}" --scope ${scope}`);
  const i = raw.indexOf("{");
  if (i < 0) throw new Error("No JSON from vercel api");
  return JSON.parse(raw.slice(i));
}

function normalizeSha(sha) {
  return String(sha || "").trim().toLowerCase();
}

function shaMatches(full, shortOrFull) {
  const a = normalizeSha(full);
  const b = normalizeSha(shortOrFull);
  if (!a || !b) return false;
  return a.startsWith(b) || b.startsWith(a);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!opts.sha || opts.sha.length < 7) {
    console.error("USAGE: node scripts/poll-vercel-preview-by-sha.mjs --sha <commitSha>");
    process.exit(4);
  }

  const started = Date.now();
  let interval = opts.initialIntervalMs;
  let lastState = "UNKNOWN";
  let matched = null;

  console.log(
    JSON.stringify({
      event: "poll_start",
      sha: opts.sha,
      project: opts.project,
      scope: opts.scope,
      timeoutMs: opts.timeoutMs,
      note: "Timeout is infrastructure-only and must not be reported as a Reader DS UI regression.",
    })
  );

  while (Date.now() - started < opts.timeoutMs) {
    let rows = [];
    try {
      rows = listDeployments(opts.project, opts.scope);
    } catch (e) {
      console.log(
        JSON.stringify({
          event: "list_error",
          message: e instanceof Error ? e.message : String(e),
          productRegression: false,
        })
      );
    }

    for (const row of rows.slice(0, 12)) {
      let detail;
      try {
        detail = inspectDeployment(row.url, opts.scope);
      } catch {
        continue;
      }
      const deploySha =
        detail?.gitSource?.sha ||
        detail?.meta?.githubCommitSha ||
        detail?.meta?.gitCommitSha ||
        "";
      if (!shaMatches(deploySha, opts.sha)) continue;

      const state = String(detail.readyState || row.state || "UNKNOWN").toUpperCase();
      lastState = state;
      matched = {
        id: detail.id,
        url: detail.url ? `https://${detail.url}` : row.url,
        aliases: detail.alias || detail.aliases || [],
        sha: deploySha,
        state,
        branch: detail?.gitSource?.ref || detail?.meta?.githubCommitRef || "",
        project: detail.name || opts.project,
      };

      console.log(JSON.stringify({ event: "poll_match", ...matched }));

      if (state === "ERROR" || state === "CANCELED" || state === "CANCELLED") {
        console.log(
          JSON.stringify({
            event: "deployment_failed",
            classification: "infrastructure_or_build_failure",
            productRegression: false,
            ...matched,
          })
        );
        process.exit(2);
      }

      if (state === "READY") {
        console.log(
          JSON.stringify({
            event: "ready",
            classification: "deployment_ready",
            productRegression: false,
            verifiedSha: matched.sha,
            ...matched,
          })
        );
        process.exit(0);
      }
    }

    console.log(
      JSON.stringify({
        event: "poll_wait",
        lastState,
        elapsedMs: Date.now() - started,
        nextIntervalMs: interval,
      })
    );
    await sleep(interval);
    interval = Math.min(opts.maxIntervalMs, Math.round(interval * 1.25));
  }

  console.log(
    JSON.stringify({
      event: "timeout",
      classification: "deployment_readiness_polling_timeout",
      productRegression: false,
      lastState,
      expectedSha: opts.sha,
      matched,
      note: "Timeout does not prove missing Reader DS markup. Re-run after build or inspect Ready deployment by SHA.",
    })
  );
  process.exit(3);
}

main().catch((e) => {
  console.error(e);
  process.exit(4);
});
