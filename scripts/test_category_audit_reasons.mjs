import { resolveCanonicalCategories } from "../src/lib/editorial/canonical-categories.ts";
import fs from "node:fs";

async function testAuditReasons() {
  const dump = JSON.parse(fs.readFileSync("scripts/production_queue_dump.json", "utf-8"));
  for (const s of dump) {
    const res = resolveCanonicalCategories({
      headline: s.headline,
      summary: s.summary,
      section: s.section,
      district: s.district,
      districtSlug: s.districtSlug,
    });
    console.log(`\n[Story ${s.index}] ${s.headline.slice(0, 50)}...`);
    console.log(`   Categories: ${res.categories.join(", ")}`);
    console.log(`   Audit:`, res.auditReasons);
  }
}

testAuditReasons().catch(console.error);
