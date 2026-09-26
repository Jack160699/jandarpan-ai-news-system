import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const content = fs.readFileSync(".env.production.local", "utf8");
const lines = content.split("\n");
const getVal = (key) => {
  const line = lines.find((l) => l.startsWith(key + "="));
  if (!line) return "";
  let v = line.slice(key.length + 1).trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  return v;
};

let url = getVal("NEXT_PUBLIC_SUPABASE_URL");
if (!url.startsWith("http")) url = "https://" + url;
const key = getVal("SUPABASE_SERVICE_ROLE_KEY");

console.log("Connecting to Supabase at:", url);
const sb = createClient(url, key);

const { count, error } = await sb.from("generated_articles").select("count", { count: "exact", head: true });
if (error) {
  console.error("Supabase Error:", error);
} else {
  console.log("✅ Successfully connected to Supabase! Total generated_articles count:", count);
}
