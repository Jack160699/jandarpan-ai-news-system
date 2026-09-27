import fs from "fs";

async function pullMatrix() {
  const res = await fetch("https://www.jandarpan.news/api/ops/editorial-batch?action=bilingual_matrix").then(r => r.json());
  const matrix = res.matrix;
  console.log("Matrix summary:", {
    localCount: matrix.localSample?.length,
    statewideCount: matrix.statewideSample?.length,
    nationalIntlCount: matrix.nationalIntlSample?.length,
  });

  const isDeva = s => /[\u0900-\u097F]/.test(s || "");

  const fullReport = [];

  function auditSample(items, type) {
    console.log("\n========================================");
    console.log("AUDIT FOR " + type.toUpperCase() + " (" + items.length + " stories)");
    console.log("========================================");
    items.forEach((item, idx) => {
      const hlHiDeva = isDeva(item.headlineHi);
      const hlEnLatin = !isDeva(item.headlineEn) && item.headlineEn.length > 5;
      const sumHiDeva = isDeva(item.summaryHi);
      const sumEnLatin = !isDeva(item.summaryEn) && item.summaryEn.length > 5;
      const bodyHiDeva = isDeva(item.bodyHi);
      const bodyEnLatin = !isDeva(item.bodyEn) && item.bodyEn.length > 5;
      const districtHiDeva = isDeva(item.displayTagHi) || isDeva(item.districtHi);
      const districtEnLatin = !isDeva(item.displayTagEn) && !isDeva(item.districtEn);
      const imageOk = Boolean(item.imageUrl && item.imageValid);

      const entry = {
        sampleCategory: type,
        idx: idx + 1,
        id: item.id,
        slug: item.slug,
        scope: item.scope,
        districtSlug: item.districtSlug,
        localityEn: item.localityEn,
        localityHi: item.localityHi,
        displayTagHi: item.displayTagHi,
        displayTagEn: item.displayTagEn,
        headlineHi: item.headlineHi,
        headlineEn: item.headlineEn,
        summaryHi: item.summaryHi,
        summaryEn: item.summaryEn,
        bodyHiLength: item.bodyHi?.length || 0,
        bodyEnLength: item.bodyEn?.length || 0,
        imageUrl: item.imageUrl,
        imageValid: item.imageValid,
        checks: {
          hlHiDeva,
          hlEnLatin,
          sumHiDeva,
          sumEnLatin,
          bodyHiDeva,
          bodyEnLatin,
          districtHiDeva,
          districtEnLatin,
          imageOk,
          allPassed: hlHiDeva && hlEnLatin && sumHiDeva && sumEnLatin && bodyHiDeva && bodyEnLatin && districtHiDeva && districtEnLatin && imageOk,
        }
      };
      fullReport.push(entry);

      console.log(`[${idx + 1}] ID: ${item.id}`);
      console.log(`    Scope: ${item.scope} | District: ${item.districtSlug || "N/A"} | Locality: ${item.localityEn || "N/A"}`);
      console.log(`    Display Tag: HI="${item.displayTagHi}" | EN="${item.displayTagEn}"`);
      console.log(`    Headline HI (${hlHiDeva ? "PASS" : "FAIL"}): ${item.headlineHi.slice(0, 45)}...`);
      console.log(`    Headline EN (${hlEnLatin ? "PASS" : "FAIL"}): ${item.headlineEn.slice(0, 45)}...`);
      console.log(`    Summary  HI (${sumHiDeva ? "PASS" : "FAIL"}): ${item.summaryHi.slice(0, 45)}...`);
      console.log(`    Summary  EN (${sumEnLatin ? "PASS" : "FAIL"}): ${item.summaryEn.slice(0, 45)}...`);
      console.log(`    Body     HI (${bodyHiDeva ? "PASS" : "FAIL"}): ${item.bodyHi?.slice(0, 45)}...`);
      console.log(`    Body     EN (${bodyEnLatin ? "PASS" : "FAIL"}): ${item.bodyEn?.slice(0, 45)}...`);
      console.log(`    Image Valid (${imageOk ? "PASS" : "FAIL"}): ${item.imageUrl.slice(0, 45)}...`);
      console.log(`    ALL PASS: ${entry.checks.allPassed}`);
    });
  }

  auditSample(matrix.localSample, "Local Stories");
  auditSample(matrix.statewideSample, "Statewide Stories");
  auditSample(matrix.nationalIntlSample, "National / International Stories");

  fs.writeFileSync("scripts/production_matrix_results.json", JSON.stringify(fullReport, null, 2));
  console.log("\nWrote full report to scripts/production_matrix_results.json");
}

pullMatrix().catch(console.error);
