import { readFileSync, writeFileSync } from "node:fs";

const src = process.argv[2];
const dest = process.argv[3];
const j = JSON.parse(readFileSync(src, "utf8"));
const b = j.data || j.result?.data;
if (!b) {
  console.error("keys", Object.keys(j));
  process.exit(1);
}
const buf = Buffer.from(b, "base64");
writeFileSync(dest, buf);
console.log("wrote", dest, buf.length);
