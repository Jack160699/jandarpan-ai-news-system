import fs from "fs";
import { resolveCanonicalStoryDistrict } from "@/lib/regional/canonical-district";

const articles = JSON.parse(fs.readFileSync("scripts/static_wire_articles_dump.json", "utf8"));
console.log(`Classifying ${articles.length} static wire articles...`);

const scopes: Record<string, number> = { local: 0, statewide: 0, national: 0, international: 0 };
const districts: Record<string, number> = {};
const localities: Record<string, number> = {};

articles.forEach((a: any, i: number) => {
  const res = resolveCanonicalStoryDistrict({
    headline: a.headline,
    summary: a.summary,
    body: a.body,
    tags: a.tags,
    section: a.tags[0],
  });
  scopes[res.geographicScope] = (scopes[res.geographicScope] || 0) + 1;
  if (res.districtSlug) {
    districts[res.districtSlug] = (districts[res.districtSlug] || 0) + 1;
  }
  if (res.localityEn) {
    localities[res.localityEn] = (localities[res.localityEn] || 0) + 1;
  }
  console.log(`[${i + 1}] ID: ${a.id.slice(0, 30)}... | Scope: ${res.geographicScope} | Dist: ${res.nameEn || "Statewide"} | Loc: ${res.localityEn || "-"}`);
});

console.log("\n=== GEOGRAPHIC SCOPES ===");
console.log(scopes);
console.log("\n=== DISTRICTS ===");
console.log(districts);
console.log("\n=== LOCALITIES ===");
console.log(localities);
