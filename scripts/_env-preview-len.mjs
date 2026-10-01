import fs from "node:fs";
import { execSync } from "node:child_process";

try {
  execSync("npx vercel env pull .env.preview.local --environment preview --yes", {
    stdio: "inherit",
    shell: true,
  });
} catch {
  console.log("pull_failed");
}

const p = ".env.preview.local";
if (!fs.existsSync(p)) {
  console.log("no_file");
  process.exit(0);
}
const t = fs.readFileSync(p, "utf8");
for (const k of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "ULIP_API_KEY",
  "IBJA_ACCESS_TOKEN",
  "IBJA_DISPLAY_CONSENT",
  "VERIFIED_RATES_FUEL_ENABLED",
  "DATA_GOV_IN_API_KEY",
]) {
  const m = t.match(new RegExp("^" + k + "=(.*)$", "m"));
  const raw = m ? m[1].trim() : null;
  const v = raw ? raw.replace(/^["']|["']$/g, "") : null;
  console.log(k, v == null ? "ABSENT" : "len=" + v.length);
}
