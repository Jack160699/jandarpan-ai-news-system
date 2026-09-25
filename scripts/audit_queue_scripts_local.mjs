import { generateAnchorSpokenScript } from "../src/lib/broadcast/anchor-script-engine.ts";

async function auditProductionQueueWithNewEngine() {
  const resHi = await fetch("https://www.jandarpan.news/api/broadcast/feed?lang=hi");
  const dataHi = await resHi.json();
  const queueHi = dataHi.queue || [];

  const resEn = await fetch("https://www.jandarpan.news/api/broadcast/feed?lang=en");
  const dataEn = await resEn.json();
  const queueEn = dataEn.queue || [];

  console.log(`Auditing ${queueHi.length} Hindi stories with new Anchor Script Engine:`);

  const resultsHi = [];
  for (let i = 0; i < queueHi.length; i++) {
    const s = queueHi[i];
    const scriptRes = generateAnchorSpokenScript({
      headline: s.headlineHi || s.headline,
      summary: s.summaryHi || s.summary,
      articleBody: s.articleBodyHi || s.articleBody || s.summary,
      language: "hi"
    });

    const headline = s.headlineHi || s.headline;
    const cleanHl = headline.replace(/[।,?!…\.]/g, "").slice(0, 30);
    const count = (scriptRes.script.match(new RegExp(cleanHl, "g")) || []).length;
    const hasDuplicate = count > 1;
    const isAbrupt = scriptRes.script.length < 50 || !/[।?!.]$/.test(scriptRes.script);
    const hasEllipsis = /[\u2026]|\.{3,}/.test(scriptRes.script);

    resultsHi.push({
      idx: i + 1,
      id: s.id.slice(0, 15),
      headlineChars: headline.length,
      scriptChars: scriptRes.script.length,
      suppCount: scriptRes.supportingCount,
      hasDuplicate,
      isAbrupt,
      hasEllipsis,
      snippet: scriptRes.script.slice(0, 60) + "...",
    });
  }

  console.table(resultsHi);

  console.log(`Auditing ${queueEn.length} English stories with new Anchor Script Engine:`);
  const resultsEn = [];
  for (let i = 0; i < queueEn.length; i++) {
    const s = queueEn[i];
    const scriptRes = generateAnchorSpokenScript({
      headline: s.headlineEn || s.headline,
      summary: s.summaryEn || s.summary,
      articleBody: s.articleBodyEn || s.articleBody || s.summary,
      language: "en"
    });

    const headline = s.headlineEn || s.headline;
    const cleanHl = headline.replace(/[।,?!…\.]/g, "").slice(0, 30);
    const count = (scriptRes.script.match(new RegExp(cleanHl, "g")) || []).length;
    const hasDuplicate = count > 1;
    const isAbrupt = scriptRes.script.length < 50 || !/[।?!.]$/.test(scriptRes.script);
    const hasEllipsis = /[\u2026]|\.{3,}/.test(scriptRes.script);

    resultsEn.push({
      idx: i + 1,
      id: s.id.slice(0, 15),
      headlineChars: headline.length,
      scriptChars: scriptRes.script.length,
      suppCount: scriptRes.supportingCount,
      hasDuplicate,
      isAbrupt,
      hasEllipsis,
      snippet: scriptRes.script.slice(0, 60) + "...",
    });
  }

  console.table(resultsEn);
}

auditProductionQueueWithNewEngine().catch(console.error);
