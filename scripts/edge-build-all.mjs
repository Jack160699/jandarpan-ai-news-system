/**
 * Builds (or only audits, with --check) every Supabase Edge worker bundle with the strict compatibility audit.
 *   node scripts/edge-build-all.mjs [--check]
 * Exit code is non-zero if any worker's dependency graph reaches something the Edge runtime cannot run.
 */
import { spawnSync } from "node:child_process";

const WORKERS = ["editorial-worker", "fetch-worker", "cluster-worker", "translation-worker"];
const check = process.argv.includes("--check");
let failed = 0;
for (const w of WORKERS) {
  const args = ["scripts/edge-bundle-check.mjs", `src/edge/${w}/serve.ts`];
  if (!check) args.push("--out", `supabase/functions/${w}/worker.bundle.js`);
  const r = spawnSync(process.execPath, args, { encoding: "utf8" });
  const lines = (r.stdout ?? "").split("\n");
  const size = lines.find((l) => l.startsWith("bundle:")) ?? "";
  console.log(`${r.status === 0 ? "OK  " : "FAIL"} ${w}  ${size}`);
  if (r.status !== 0) {
    failed++;
    console.log(lines.filter((l) => /INCOMPATIBLE| x |->/.test(l)).slice(0, 12).join("\n"));
  }
}
process.exitCode = failed ? 1 : 0;
