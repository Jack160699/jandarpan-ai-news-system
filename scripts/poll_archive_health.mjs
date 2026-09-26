async function poll() {
  const url = "https://www.jandarpan.news/api/ops/archive-health";
  console.log("Polling for deployment update at:", url);
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(url + "?_t=" + Date.now(), { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.operational_funnel) {
          console.log(`[${i + 1}] SUCCESS! New operational_funnel is live on production:`);
          console.log(JSON.stringify(data.operational_funnel, null, 2));
          process.exit(0);
        } else {
          console.log(`[${i + 1}] Old deployment still responding (no operational_funnel yet)...`);
        }
      } else {
        console.log(`[${i + 1}] HTTP status:`, res.status);
      }
    } catch (e) {
      console.log(`[${i + 1}] Fetch error:`, e.message);
    }
    await new Promise((r) => setTimeout(r, 6000));
  }
  console.log("Timeout waiting for deployment");
  process.exit(1);
}

poll();
