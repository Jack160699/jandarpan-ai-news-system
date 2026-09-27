import fs from "fs";
import path from "path";

const dir = "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\Sessions";
const files = fs.readdirSync(dir);

for (const file of files) {
  const filePath = path.join(dir, file);
  try {
    const buf = fs.readFileSync(filePath);
    const text = buf.toString("utf-8", 0, buf.length);
    // Find G- measurement IDs
    const gMatches = text.match(/G-[A-Z0-9]{8,12}/g);
    if (gMatches) {
      console.log(`Measurement IDs in ${file}:`, Array.from(new Set(gMatches)));
    }
    // Search around a395102226
    let idx = 0;
    while ((idx = text.indexOf("395102226", idx)) !== -1) {
      const start = Math.max(0, idx - 100);
      const end = Math.min(text.length, idx + 200);
      console.log(`Context in ${file} at ${idx}:\n`, text.substring(start, end).replace(/[^\x20-\x7E]+/g, ' '));
      idx += 9;
    }
  } catch (e) {}
}
