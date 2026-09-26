async function checkParity() {
  const res = await fetch("https://www.jandarpan.news/api/ops/archive-health", {
    headers: { "Cache-Control": "no-cache" }
  });
  const data = await res.json();
  console.log("Archive Health Details:", JSON.stringify(data.archive_health, null, 2));
}
checkParity().catch(console.error);
