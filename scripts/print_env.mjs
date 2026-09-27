import fs from "fs";

const files = fs.readdirSync(".", { withFileTypes: true });
for (const f of files) {
  if (f.name.startsWith(".env")) {
    console.log(`=== ${f.name} ===`);
    console.log(fs.readFileSync(f.name, "utf-8"));
  }
}
