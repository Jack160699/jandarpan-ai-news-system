import fs from "fs";
import path from "path";

const profileDir = "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1";

// Recursive search in Cache and Service Worker
function searchDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name !== "Cache_Data" && ent.name !== "Code Cache") {
        searchDir(full);
      }
    } else if (ent.isFile()) {
      try {
        const buf = fs.readFileSync(full);
        const text = buf.toString("latin1");
        
        // If 538010450 is in this file:
        if (text.includes("538010450")) {
          console.log(`Found 538010450 in: ${full}`);
          const gMatches = text.match(/G-[A-Z0-9]{8,12}/g);
          if (gMatches) {
            console.log(`G- matches in ${full}:`, Array.from(new Set(gMatches)));
          }
          const streamMatches = text.match(/streams\/[0-9]+/g);
          if (streamMatches) {
            console.log(`Stream matches in ${full}:`, Array.from(new Set(streamMatches)));
          }
          // Print surrounding text
          let idx = text.indexOf("538010450");
          console.log("Snippet:\n", text.substring(Math.max(0, idx - 100), Math.min(text.length, idx + 200)).replace(/[^\x20-\x7E]+/g, ' '));
        }
      } catch (e) {}
    }
  }
}

searchDir(profileDir);
