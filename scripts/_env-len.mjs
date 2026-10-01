import fs from "node:fs";
function check(path) {
  if (!fs.existsSync(path)) return console.log(path, "missing");
  const t = fs.readFileSync(path, "utf8");
  for (const k of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CRON_SECRET",
  ]) {
    const m = t.match(new RegExp("^" + k + "=(.*)$", "m"));
    const raw = m ? m[1].trim() : null;
    const v = raw
      ? raw.replace(/^["']|["']$/g, "")
      : null;
    console.log(
      path,
      k,
      v === null ? "ABSENT" : `len=${v.length} empty=${v.length === 0}`
    );
  }
}
check(".env.local");
check(".env.production.local");
