import sqlite3 from "better-sqlite3";
import fs from "fs";

// Copy History to avoid lock
fs.copyFileSync(
  "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\History",
  "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\Temp\\History_copy"
);

const db = sqlite3("C:\\Users\\shriyansh chandrakar\\AppData\\Local\\Temp\\History_copy");
const rows = db.prepare("SELECT url, title, visit_count, last_visit_time FROM urls WHERE url LIKE '%analytics.google.com%' OR url LIKE '%console.cloud.google.com%' ORDER BY last_visit_time DESC LIMIT 100").all();

for (const row of rows) {
  console.log(`URL: ${row.url}\nTITLE: ${row.title}\nVISITS: ${row.visit_count}\n---`);
}
