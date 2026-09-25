async function auditProductionScripts() {
  const resHi = await fetch('https://www.jandarpan.news/api/broadcast/feed?lang=hi', { cache: 'no-store' });
  const dataHi = await resHi.json();
  const queueHi = dataHi.queue || [];
  
  console.log(`=== AUDITING ALL ${queueHi.length} LIVE PRODUCTION HINDI SCRIPTS ===`);
  let flags = 0;
  queueHi.forEach((s, idx) => {
    const hasEllipsis = /[\u2026]|\.{3,}/.test(s.script);
    const isEmpty = !s.script || s.script.trim().length === 0;
    const isTruncated = s.headline.endsWith('…') || s.headline.endsWith('...');
    
    // Check if headline repeated verbatim: "HEADLINE. HEADLINE."
    const normH = s.headline.replace(/[\s।,.?!]/g, '');
    const normS = s.script.replace(/[\s।,.?!]/g, '');
    const isDupe = normS === normH + normH;
    
    // Check if overview was completely dropped (script equals just headline)
    const isJustHeadline = normS === normH;

    console.log(`[Story ${idx + 1}] ID: ${s.id.slice(0, 20)} | District: ${s.district} (${s.districtSlug})`);
    console.log(`   Headline: ${s.headline}`);
    console.log(`   Script:   ${s.script}`);
    console.log(`   Checks:   ellipsis=${hasEllipsis}, empty=${isEmpty}, truncHead=${isTruncated}, dupeHead=${isDupe}, justHead=${isJustHeadline}`);

    if (hasEllipsis || isEmpty || isTruncated || isDupe) {
      console.log(`   >>> FLAGGED ISSUE IN STORY ${idx + 1} <<<`);
      flags++;
    }
  });

  console.log(`\nTOTAL FLAGGED HINDI SCRIPTS: ${flags} / ${queueHi.length}`);

  const resEn = await fetch('https://www.jandarpan.news/api/broadcast/feed?lang=en', { cache: 'no-store' });
  const dataEn = await resEn.json();
  const queueEn = dataEn.queue || [];
  console.log(`\n=== AUDITING ALL ${queueEn.length} LIVE PRODUCTION ENGLISH SCRIPTS ===`);
  let flagsEn = 0;
  queueEn.forEach((s, idx) => {
    const hasEllipsis = /[\u2026]|\.{3,}/.test(s.script);
    const isEmpty = !s.script || s.script.trim().length === 0;
    const isTruncated = s.headline.endsWith('…') || s.headline.endsWith('...');
    const normH = s.headline.replace(/[\s।,.?!]/g, '').toLowerCase();
    const normS = s.script.replace(/[\s।,.?!]/g, '').toLowerCase();
    const isDupe = normS === normH + normH;

    if (hasEllipsis || isEmpty || isTruncated || isDupe) {
      console.log(`[FLAG-EN] Story ${idx + 1} (${s.id.slice(0, 20)}): ellipsis=${hasEllipsis}, empty=${isEmpty}, truncHead=${isTruncated}, dupe=${isDupe}`);
      flagsEn++;
    }
  });
  console.log(`TOTAL FLAGGED ENGLISH SCRIPTS: ${flagsEn} / ${queueEn.length}`);
}

auditProductionScripts().catch(console.error);
