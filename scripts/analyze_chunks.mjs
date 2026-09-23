import https from "https";

function fetchText(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(data));
    }).on("error", () => resolve(""));
  });
}

async function analyze() {
  const html = await fetchText("https://www.jandarpan.news/");
  const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);

  console.log(`Analyzing ${scripts.length} homepage scripts...`);
  const keywords = [
    "sentry", "@supabase", "tanstack", "tiptap", "recharts", "lucide", "framer-motion",
    "marked", "date-fns", "crypto", "lodash", "buffer", "zod", "posthog", "segment",
    "reader-ds", "MandiRates", "UtilTiles", "ReservedAd", "PermissionSheet", "ThemeScript",
    "AppChrome", "DesktopPrimaryNav", "Masthead", "FormatStoryCard", "AliveHome", "audio"
  ];

  for (const s of scripts) {
    const fullUrl = "https://www.jandarpan.news" + s;
    const code = await fetchText(fullUrl);
    const sizeKb = (code.length / 1024).toFixed(1);
    const found = keywords.filter((k) => code.toLowerCase().includes(k.toLowerCase()));
    console.log(`${sizeKb} KB : ${s.split("/").pop()} -> ${found.join(", ")}`);
  }
}

analyze().catch(console.error);
