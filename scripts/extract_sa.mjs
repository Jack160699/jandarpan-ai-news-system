import fs from "fs";

const text = fs.readFileSync(".env.production.real", "utf-8");
const startMarker = 'GSC_SERVICE_ACCOUNT_JSON="';
const start = text.indexOf(startMarker);
const end = text.indexOf('"\nGSC_SITE_URL', start);
const raw = text.substring(start + startMarker.length, end);

// Replace literal newlines with \n for JSON parse
const jsonStr = raw.replace(/\r?\n/g, "\\n");
const sa = JSON.parse(jsonStr);

console.log("Service Account:", sa.client_email);
console.log("Project:", sa.project_id);

fs.writeFileSync("sa_temp.json", JSON.stringify(sa, null, 2));
console.log("Written sa_temp.json successfully!");
