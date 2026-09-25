async function test() {
  const res = await fetch("https://www.jandarpan.news/api/broadcast/feed?lang=hi");
  const d = await res.json();
  console.log("Stories count:", d.queue?.length);
  for (let i = 0; i < (d.queue || []).length; i++) {
    const s = d.queue[i];
    console.log(`\n--- Story ${i + 1}: [${s.district || s.districtHi || "State"}] ---`);
    console.log("Headline:", s.headline);
    console.log("Summary:", s.summary?.slice(0, 100));
    console.log("Tags on segment:", s.canonicalCategories);
    console.log("Primary Category:", s.primaryCategory);
    console.log("Section:", s.section);
  }
}
test();
