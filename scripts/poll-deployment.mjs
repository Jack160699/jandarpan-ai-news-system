async function poll() {
  const url = "https://www.jandarpan.news/api/broadcast/feed?lang=en";
  console.log("Polling:", url);
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(url + "&_t=" + Date.now(), { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const count = data.queue ? data.queue.length : 0;
        console.log(`[${i + 1}] Received ${count} stories for lang=en`);
        if (count > 0) {
          console.log("SUCCESS: Deployment is live with English queue count:", count);
          process.exit(0);
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
