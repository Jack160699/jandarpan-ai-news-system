import fs from "fs";

const file = "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\Sessions\\Session_13434941342614587";
const data = fs.readFileSync(file);
const content = data.toString("latin1");

const urls = content.match(/https?:\/\/[a-zA-Z0-9.-]+(?:\/[^\s\x00-\x1f\x7f-\xff]*)?/g) || [];
const uniqueUrls = Array.from(new Set(urls.map(u => u.replace(/[^\x20-\x7E]+.*$/, ''))));
console.log("All URLs in current session:");
for (const u of uniqueUrls) {
  console.log(u);
}
