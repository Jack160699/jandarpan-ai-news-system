import fs from "fs";

let envLocal = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";

const keysToAdd = [
  ["NEXT_PUBLIC_SUPABASE_URL", "https://giiuqshoconjbpiueasp.supabase.co"],
  [
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpaXVxc2hvY29uamJwaXVlYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODQ0MzcsImV4cCI6MjA5NDk2MDQzN30.0BvXpL4aLX-ynrWTr8leru3yl3TpCpBsvv6uRYbyIO4",
  ],
  [
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpaXVxc2hvY29uamJwaXVlYXNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM4NDQzNywiZXhwIjoyMDk0OTYwNDM3fQ.76wd0-LwKgjWfmcuTaRilhbA5WmGuu-WNwynTU2xpU4",
  ],
];

for (const [k, v] of keysToAdd) {
  if (envLocal.includes(`${k}=`)) {
    envLocal = envLocal.replace(new RegExp(`${k}=.*`, "g"), `${k}="${v}"`);
  } else {
    envLocal += `\n${k}="${v}"`;
  }
}

fs.writeFileSync(".env.local", envLocal.trim() + "\n", "utf8");
console.log(".env.local updated successfully with valid Supabase keys!");
