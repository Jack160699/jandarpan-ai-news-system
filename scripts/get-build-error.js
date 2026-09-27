const cp = require('child_process');
const out = cp.execSync('npx vercel api "/v2/deployments/dpl_GYdjTovfBXxpSmiZPrFoyZvbNZRE/events" --scope jack160699s-projects', { maxBuffer: 15 * 1024 * 1024 }).toString();
const i = out.indexOf('[');
if (i < 0) {
  console.log("No JSON found");
  process.exit(1);
}
const events = JSON.parse(out.slice(i));
for (const e of events) {
  const t = e.payload?.text;
  if (t && (e.type === 'stderr' || t.includes('Error') || t.includes('error') || t.includes('failed') || t.includes('not found') || t.includes('Failed'))) {
    console.log(`[${e.type}] ${t}`);
  }
}
