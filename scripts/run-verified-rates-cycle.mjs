/**
 * One controlled verification cycle against linked env.
 * Usage: node --import tsx scripts/run-verified-rates-cycle.mjs
 * Or: npx tsx scripts/run-verified-rates-cycle.ts
 */
import { runVerification } from "../src/lib/verified-rates/verify.ts";

const jobs = [
  { category: "petrol", citySlug: "raipur" },
  { category: "petrol", citySlug: "durg" },
  { category: "petrol", citySlug: "bhilai" },
  { category: "diesel", citySlug: "raipur" },
  { category: "diesel", citySlug: "durg" },
  { category: "diesel", citySlug: "bhilai" },
  { category: "gold_24k", citySlug: null },
  { category: "gold_22k", citySlug: null },
  { category: "silver_999", citySlug: null },
];

const out = [];
for (const job of jobs) {
  const r = await runVerification(job);
  out.push({ ...job, ...r });
  console.log(JSON.stringify({ ...job, ...r }));
}
console.log(JSON.stringify({ summary: out }, null, 2));
