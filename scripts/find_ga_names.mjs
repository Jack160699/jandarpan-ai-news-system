import fs from "fs";
import path from "path";

const profileDir = "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1";

// Search in History, Web Data, Preferences, and Network
const searchFiles = ["History", "Preferences", "Web Data", "Network\\Cookies"];

for (const sf of searchFiles) {
  const p = path.join(profileDir, sf);
  if (!fs.existsSync(p)) continue;
  try {
    const buf = fs.readFileSync(p);
    const text = buf.toString("latin1");
    
    // Look for G- measurement IDs
    const gMatches = text.match(/G-[A-Z0-9]{8,12}/g);
    if (gMatches) {
      console.log(`Measurement IDs found in ${sf}:`, Array.from(new Set(gMatches)));
    }

    // Look for 554621476 or 538010450
    for (const prop of ["554621476", "538010450", "395102226"]) {
      let idx = 0;
      while ((idx = text.indexOf(prop, idx)) !== -1) {
        const start = Math.max(0, idx - 150);
        const end = Math.min(text.length, idx + 200);
        console.log(`Context of ${prop} in ${sf}:\n`, text.substring(start, end).replace(/[^\x20-\x7E]+/g, ' '));
        idx += prop.length + 20;
      }
    }
  } catch (e) {}
}
