import fs from "fs";

async function auditLiveProductionQueue() {
  const [hiRes, enRes] = await Promise.all([
    fetch("https://www.jandarpan.news/api/broadcast/feed?lang=hi&cb=" + Date.now()).then(r => r.json()),
    fetch("https://www.jandarpan.news/api/broadcast/feed?lang=en&cb=" + Date.now()).then(r => r.json()),
  ]);

  const hiQ = hiRes.queue || [];
  const enQ = enRes.queue || [];

  console.log(`Live Queue: ${hiQ.length} Hindi, ${enQ.length} English`);

  const isDeva = s => /[\u0900-\u097F]/.test(s || "");

  const matrix = [];

  for (let i = 0; i < hiQ.length; i++) {
    const h = hiQ[i];
    const e = enQ[i];

    const sameId = h.id === e?.id;
    const sameSlug = h.slug === e?.slug;

    // Fetch story detail for both to audit full article body
    const [hiDetail, enDetail] = await Promise.all([
      fetch(`https://www.jandarpan.news/api/story-detail?slug=${h.slug}&lang=hi`).then(r => r.json()).catch(() => ({})),
      fetch(`https://www.jandarpan.news/api/story-detail?slug=${h.slug}&lang=en`).then(r => r.json()).catch(() => ({})),
    ]);

    const hlHiOk = isDeva(h.headline);
    const hlEnOk = !isDeva(e?.headline) && (e?.headline?.length || 0) > 5;

    const sumHiOk = isDeva(h.summary);
    const sumEnOk = !isDeva(e?.summary) && (e?.summary?.length || 0) > 5;

    const bodyHi = hiDetail?.content || h.articleBody || "";
    const bodyEn = enDetail?.content || e?.articleBody || "";

    const bodyHiOk = isDeva(bodyHi);
    const bodyEnOk = !isDeva(bodyEn) && bodyEn.length > 10;

    const distHiOk = isDeva(h.displayTagHi || h.districtHi || h.district);
    const distEnOk = !isDeva(e?.displayTagEn || e?.districtEn || e?.district);

    const catHiOk = isDeva(h.categoryLabelHi || h.categoryLabel);
    const catEnOk = !isDeva(e?.categoryLabelEn || e?.categoryLabel);

    const scriptHiOk = isDeva(h.script);
    const scriptEnOk = !isDeva(e?.script) && (e?.script?.length || 0) > 10;

    const imageOk = Boolean(h.imageUrl && e?.imageUrl && h.imageUrl === e?.imageUrl && h.imageUrl.startsWith("http"));

    const item = {
      idx: i + 1,
      id: h.id,
      slug: h.slug,
      scope: h.geographicScope || "local",
      districtSlug: h.districtSlug,
      locality: h.locality,
      headline: { hi: h.headline, en: e?.headline, correct: hlHiOk && hlEnOk },
      overview: { hi: h.summary, en: e?.summary, correct: sumHiOk && sumEnOk },
      body: { hiLength: bodyHi.length, enLength: bodyEn.length, correct: bodyHiOk && bodyEnOk },
      district: { hi: h.displayTagHi || h.districtHi, en: e?.displayTagEn || e?.districtEn, correct: distHiOk && distEnOk },
      localityDisplay: { hi: h.localityHi, en: h.localityEn, correct: true },
      category: { hi: h.categoryLabelHi || h.categoryLabel, en: e?.categoryLabelEn || e?.categoryLabel, correct: catHiOk && catEnOk },
      image: { url: h.imageUrl, correct: imageOk },
      narration: { hi: h.script, en: e?.script, correct: scriptHiOk && scriptEnOk },
      sameStoryId: sameId && sameSlug,
      allPassed: sameId && hlHiOk && hlEnOk && sumHiOk && sumEnOk && bodyHiOk && bodyEnOk && distHiOk && distEnOk && catHiOk && catEnOk && scriptHiOk && scriptEnOk && imageOk,
    };

    matrix.push(item);
    console.log(`[${i + 1}/${hiQ.length}] ${h.id.slice(0, 16)}... | SameID: ${sameId} | HL_EN: ${hlEnOk} | BODY_EN: ${bodyEnOk} | SCRIPT_EN: ${scriptEnOk} | IMG: ${imageOk}`);
  }

  const passCount = matrix.filter(m => m.allPassed).length;
  console.log(`\nAudit Complete: ${passCount}/${matrix.length} fully passed all criteria.`);

  fs.writeFileSync("scripts/live_queue_audit_matrix.json", JSON.stringify(matrix, null, 2));
}

auditLiveProductionQueue().catch(console.error);
