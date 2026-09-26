import fs from "fs";
const d = JSON.parse(fs.readFileSync("scripts/static_wire_articles_dump.json", "utf8"));
d.forEach((a, i) => console.log(`[${i + 1}] ID: "${a.id}" | "${a.headline.slice(0, 45)}"`));
