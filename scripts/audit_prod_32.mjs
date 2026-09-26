import fs from "fs";

async function inspect32() {
  const resHi = await fetch("https://www.jandarpan.news/api/broadcast/feed?lang=hi", { headers: { "Cache-Control": "no-cache" } });
  const dHi = await resHi.json();
  const resEn = await fetch("https://www.jandarpan.news/api/broadcast/feed?lang=en", { headers: { "Cache-Control": "no-cache" } });
  const dEn = await resEn.json();

  const isDeva = (s) => /[\u0900-\u097F]/.test(s || "");

  console.log("=== PRODUCTION 32 STORIES AUDIT ===");
  let mismatchCount = 0;
  for (let i = 0; i < dHi.queue.length; i++) {
    const hi = dHi.queue[i];
    const en = dEn.queue[i];
    const hiHeadIsDeva = isDeva(hi.headline);
    const enHeadIsDeva = isDeva(en.headline);
    const hiScriptIsDeva = isDeva(hi.script);
    const enScriptIsDeva = isDeva(en.script);

    const hasIssue = !hiHeadIsDeva || enHeadIsDeva || !hiScriptIsDeva || enScriptIsDeva;
    if (hasIssue) mismatchCount++;

    console.log(`[${i + 1}] ID: ${hi.id.slice(0, 8)}... | Dist: ${hi.district} / ${en.district}`);
    console.log(`    HI Headline (${hiHeadIsDeva ? "Devanagari" : "ENGLISH!"}): ${hi.headline?.slice(0, 50)}...`);
    console.log(`    EN Headline (${enHeadIsDeva ? "HINDI!" : "Latin"}): ${en.headline?.slice(0, 50)}...`);
    console.log(`    HI Script: ${hiScriptIsDeva ? "HI" : "EN!"} | EN Script: ${enScriptIsDeva ? "HI!" : "EN"}`);
    if (hasIssue) {
      console.log("    ⚠️ LANGUAGE MISMATCH DETECTED!");
    }
  }
  console.log(`\nTotal Stories: ${dHi.queue.length}`);
  console.log(`Mismatches: ${mismatchCount} / ${dHi.queue.length}`);
}

inspect32().catch(console.error);
