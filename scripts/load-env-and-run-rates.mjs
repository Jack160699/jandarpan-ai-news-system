import fs from "node:fs";
import { spawnSync } from "node:child_process";

function loadEnv(path) {
  if (!fs.existsSync(path)) return;
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[line.slice(0, i)]) process.env[line.slice(0, i)] = v;
  }
}

loadEnv(".env.local");
loadEnv(".env.production.local");
fs.writeFileSync("node_modules/server-only/index.js", "module.exports = {};\n");

console.log(
  JSON.stringify({
    hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  })
);

const r = spawnSync("npx", ["tsx", "scripts/run-verified-rates-cycle.ts"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
process.exit(r.status ?? 1);
