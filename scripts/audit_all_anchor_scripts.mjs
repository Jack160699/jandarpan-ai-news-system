async function auditAnchorScripts() {
  const res = await fetch("https://www.jandarpan.news/api/broadcast/feed?lang=hi");
  const data = await res.json();
  const queue = data.queue || [];

  console.log(`Auditing all ${queue.length} production story anchor scripts:`);

  const results = [];
  for (let i = 0; i < queue.length; i++) {
    const s = queue[i];
    const headline = (s.headlineHi || s.headline || "").trim();
    const script = (s.script || "").trim();
    const summary = (s.summaryHi || s.summary || "").trim();

    // Check occurrences of headline text in script
    // Clean punctuation
    const cleanHl = headline.replace(/[।,?!]/g, "").slice(0, 30);
    const count = (script.match(new RegExp(cleanHl, "g")) || []).length;
    const hasDuplicate = count > 1;
    const isAbrupt = script.length < 50 || !/[।?!.]$/.test(script);

    results.push({
      idx: i + 1,
      id: s.id,
      headlineChars: headline.length,
      scriptChars: script.length,
      headlineCount: count,
      hasDuplicate,
      isAbrupt,
      endsProperly: /[।?!.]$/.test(script),
      scriptSnippet: script.slice(0, 60) + "...",
    });
  }

  console.table(results);
}

auditAnchorScripts().catch(console.error);
