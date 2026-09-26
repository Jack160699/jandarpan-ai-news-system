async function poll() {
  for (let i = 1; i <= 20; i++) {
    try {
      const res = await fetch("https://www.jandarpan.news/api/ops/editorial-batch?action=select_batch&size=50", {
        headers: { "Cache-Control": "no-cache" }
      });
      const data = await res.json();
      const count = data.selection?.selected?.length || 0;
      console.log(`[Attempt ${i}] Selected count: ${count} (Total real media: ${data.selection?.totalEligibleWithRealMedia})`);
      if (count >= 35) {
        console.log("SUCCESS! Available candidates for Batch 2:", count);
        return;
      }
    } catch (e) {
      console.log("Error:", e.message);
    }
    await new Promise((r) => setTimeout(r, 6000));
  }
}
poll().catch(console.error);
