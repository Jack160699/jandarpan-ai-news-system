import fs from "fs";
import path from "path";

const dir = "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\Sessions";
const files = fs.readdirSync(dir);

for (const file of files) {
  const filePath = path.join(dir, file);
  try {
    const data = fs.readFileSync(filePath);
    // Find all occurrences of http:// or https://
    const content = data.toString("latin1");
    const urls = content.match(/https?:\/\/[a-zA-Z0-9.-]+(?:\/[^\s\x00-\x1f\x7f-\xff]*)?/g) || [];
    const cleanUrls = Array.from(new Set(urls.map(u => u.replace(/[^\x20-\x7E]+.*$/, ''))));
    
    const gaUrls = cleanUrls.filter(u => u.includes("analytics") || u.includes("cloud.google") || u.includes("jandarpan") || u.includes("solar") || u.includes("stratxcel"));
    if (gaUrls.length > 0) {
      console.log(`\n=== Matches in ${file} ===`);
      gaUrls.forEach(u => console.log(u));
    }
  } catch (e) {
    // Ignore locked or empty
  }
}
