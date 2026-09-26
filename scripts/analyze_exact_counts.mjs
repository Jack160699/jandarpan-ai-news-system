import fs from "fs";

const d = JSON.parse(fs.readFileSync("scripts/reconcile_output.json", "utf8"));
const table = d.reconciliation.table;
const live = table.filter((r) => r.liveEligible);
const notLive = table.filter((r) => !r.liveEligible);

console.log("Live count:", live.length);
console.log("Not live count:", notLive.length);

console.log("\n--- LIVE IN QUEUE (Count: " + live.length + ") ---");
live.forEach((r, i) => {
  console.log((i + 1) + ". " + r.id + " | " + r.headline.slice(0, 45) + " | Created: " + r.createdAt);
});

console.log("\n--- NOT LIVE IN QUEUE (Count: " + notLive.length + ") ---");
notLive.forEach((r, i) => {
  console.log((i + 1) + ". " + r.id + " | Reason: " + r.reason + " | " + r.headline.slice(0, 45) + " | Created: " + r.createdAt);
});
