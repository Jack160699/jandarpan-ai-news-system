import fs from "fs";

const content = fs.readFileSync("src/lib/news/fallback/wire-articles.ts", "utf8");
const regex = /id:\s*"([^"]+)",\s*slug:\s*"([^"]+)",\s*headline:\s*"([^"]+)"/g;
let match;
let i = 1;
const articles = [];
while ((match = regex.exec(content)) !== null) {
  articles.push({ id: match[1], slug: match[2], headline: match[3] });
  console.log(`[${i++}] ID: ${match[1]} | Slug: ${match[2]}`);
  console.log(`     Headline: ${match[3]}`);
}
console.log(`Total: ${articles.length}`);
