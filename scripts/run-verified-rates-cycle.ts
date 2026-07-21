import { runVerification } from "@/lib/verified-rates/verify";
import type { RateCategory } from "@/lib/verified-rates/types";

const jobs: Array<{ category: RateCategory; citySlug: string | null }> = [
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

async function main() {
  const out = [];
  for (const job of jobs) {
    const r = await runVerification(job);
    out.push({ ...job, ...r });
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ...job, ...r }));
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true, count: out.length, results: out }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
