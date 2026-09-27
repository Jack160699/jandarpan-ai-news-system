import fs from "fs";

const files = [
  "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\Sessions\\Tabs_13434807026133056",
  "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\Sessions\\Session_13434941342614587",
  "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\Sessions\\Tabs_13434205569467740"
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const buf = fs.readFileSync(f);
  const text = buf.toString("utf-8");
  
  // Search for G- tags
  const gMatches = text.match(/G-[A-Z0-9]{8,12}/g);
  if (gMatches) {
    console.log(`G- matches in ${f}:`, Array.from(new Set(gMatches)));
  }

  // Look for durg, solar, stratxcel, darpan near property IDs
  for (const prop of ["554621476", "538010450"]) {
    let pos = 0;
    while ((pos = text.indexOf(prop, pos)) !== -1) {
      const start = Math.max(0, pos - 200);
      const end = Math.min(text.length, pos + 300);
      const slice = text.substring(start, end).replace(/[^\x20-\x7E]+/g, ' ');
      console.log(`\nMatch for ${prop}:\n${slice}`);
      pos += prop.length + 50;
    }
  }
}
