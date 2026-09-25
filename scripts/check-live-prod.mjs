async function check() {
  console.log("Checking live production https://www.jandarpan.news...");
  try {
    const rLatest = await fetch("https://www.jandarpan.news/latest", { headers: { "Cache-Control": "no-cache" } });
    const htmlLatest = await rLatest.text();
    const tazaStories = Array.from(htmlLatest.matchAll(/href="(\/story\/[^"]+)"/g)).map(m => m[1]);
    const uniqueTaza = Array.from(new Set(tazaStories));
    console.log("Live /latest unique stories count:", uniqueTaza.length);

    const rDurg = await fetch("https://www.jandarpan.news/district/durg", { headers: { "Cache-Control": "no-cache" } });
    const htmlDurg = await rDurg.text();
    const hasDurgEmpty = htmlDurg.includes("से अभी कोई पुष्टि प्राप्त खबर नहीं");
    console.log("Live /district/durg empty state visible?:", hasDurgEmpty);
    const durgStories = Array.from(htmlDurg.matchAll(/href="(\/story\/[^"]+)"/g)).map(m => m[1]);
    console.log("Live /district/durg story count:", new Set(durgStories).size);

    const rHome = await fetch("https://www.jandarpan.news/home", { headers: { "Cache-Control": "no-cache" } });
    const htmlHome = await rHome.text();
    const homeSections = ["राजनीति", "अपराध", "राष्ट्रीय", "अंतरराष्ट्रीय", "मनोरंजन", "खेल"];
    const foundSections = homeSections.filter(s => htmlHome.includes(s));
    console.log("Live /home detected 6 canonical sections:", foundSections.length === 6, foundSections);

    const deploymentCommit = rHome.headers.get("x-vercel-id");
    console.log("Vercel ID header:", deploymentCommit);
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}
check();
