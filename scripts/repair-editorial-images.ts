#!/usr/bin/env npx tsx
/**
 * Repair editorial image URL fields where a safe correction is reliable.
 *
 * Defaults to DRY-RUN. Requires explicit --apply to write.
 * Never deletes articles. Never overwrites a valid displayable image.
 *
 * Safe repairs:
 * - Clear brand/logo/favicon/placeholder hero URLs → null (text-only fallback)
 * - Clear expired signed URLs → null
 * - Clear malformed / http URLs → null
 *
 * Usage:
 *   npx tsx scripts/repair-editorial-images.ts
 *   npx tsx scripts/repair-editorial-images.ts --limit 100
 *   npx tsx scripts/repair-editorial-images.ts --apply --limit 50
 *
 * Do not run --apply against Production from Agent 4 — Agent 7 may apply later.
 */

import fs from "node:fs";
import path from "node:path";
import { isRejectedImageUrl } from "../src/lib/news/images/validate";
import { validateImageUrlShape } from "../src/lib/news/images/image-url-validation";
import { isExpiredSignedUrl } from "../src/lib/news/images/trusted-remote-hosts";

const ROOT = path.resolve(import.meta.dirname, "..");

function loadEnvFile(file: string, override = false) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    const val = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!val || val.length < 8) continue;
    if (override || !process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env.production.local", true);

type RepairAction = {
  articleId: string;
  headline: string | null;
  before: string | null;
  after: string | null;
  reason: string;
};

type ArticleRow = {
  id: string;
  headline: string | null;
  hero_image_url: string | null;
};

function parseArgs(argv: string[]) {
  const limitIdx = argv.indexOf("--limit");
  const outIdx = argv.indexOf("--out");
  return {
    apply: argv.includes("--apply"),
    limit: limitIdx >= 0 ? Number(argv[limitIdx + 1]) || 100 : 100,
    out:
      outIdx >= 0
        ? argv[outIdx + 1]
        : path.join(
            ROOT,
            "reports",
            `editorial-image-repair-${Date.now()}.json`
          ),
  };
}

function proposeRepair(url: string | null): { after: string | null; reason: string } | null {
  if (!url?.trim()) return null;

  const shape = validateImageUrlShape(url);
  if (!shape.ok) {
    return { after: null, reason: `clear_${shape.reason ?? "malformed"}` };
  }

  if (isExpiredSignedUrl(url)) {
    return { after: null, reason: "clear_expired_signed_url" };
  }

  const rejected = isRejectedImageUrl(url);
  if (rejected.rejected) {
    const clearable = new Set([
      "brand_asset",
      "logo_or_icon",
      "placeholder",
      "tracking_pixel",
      "data_uri",
      "known_broken",
      "advertisement",
      "http_not_https",
    ]);
    if (rejected.reason && clearable.has(rejected.reason)) {
      return { after: null, reason: `clear_${rejected.reason}` };
    }
  }

  // Valid image — do not overwrite.
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(
    `[repair-editorial-images] mode=${args.apply ? "APPLY" : "DRY-RUN"} limit=${args.limit}`
  );

  if (args.apply) {
    console.warn(
      "[repair-editorial-images] WARNING: --apply will UPDATE hero_image_url. Prefer Agent 7 review."
    );
  }

  const { createAdminServerClient } = await import("../src/lib/supabase");
  const supabase = createAdminServerClient();

  const { data, error } = await supabase
    .from("generated_articles")
    .select("id, headline, hero_image_url")
    .not("published_at", "is", null)
    .not("hero_image_url", "is", null)
    .order("published_at", { ascending: false })
    .limit(args.limit);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ArticleRow[];

  const actions: RepairAction[] = [];
  for (const row of rows) {
    const proposal = proposeRepair(row.hero_image_url);
    if (!proposal) continue;
    actions.push({
      articleId: row.id,
      headline: row.headline,
      before: row.hero_image_url,
      after: proposal.after,
      reason: proposal.reason,
    });
  }

  let applied = 0;
  if (args.apply) {
    for (const action of actions) {
      if (action.before == null) continue;
      const { error: upErr } = await supabase
        .from("generated_articles")
        .update({ hero_image_url: action.after })
        .eq("id", action.articleId)
        .eq("hero_image_url", action.before); // optimistic: never overwrite if changed
      if (upErr) {
        console.error(`  failed ${action.articleId}: ${upErr.message}`);
        continue;
      }
      applied += 1;
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: args.apply ? "apply" : "dry-run",
    scanned: rows.length,
    proposed: actions.length,
    applied,
    actions,
  };

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(report, null, 2), "utf8");

  console.log("[repair-editorial-images] done");
  console.log(
    `  scanned=${report.scanned} proposed=${report.proposed} applied=${report.applied}`
  );
  console.log(`  report: ${args.out}`);
}

main().catch((err) => {
  console.error("[repair-editorial-images] failed:", err);
  process.exit(1);
});
