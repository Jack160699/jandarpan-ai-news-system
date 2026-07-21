#!/usr/bin/env npx tsx
/**
 * Audit editorial image URLs on generated_articles (read-only).
 *
 * Reports: missing, malformed, unsupported host, expired signed URL,
 * brand/logo assets, placeholders, tiny/tracking images, generated
 * records without accessible assets.
 *
 * Usage:
 *   npx tsx scripts/audit-editorial-images.ts
 *   npx tsx scripts/audit-editorial-images.ts --limit 200
 *   npx tsx scripts/audit-editorial-images.ts --check-reachability
 *   npx tsx scripts/audit-editorial-images.ts --out reports/editorial-image-audit.json
 *
 * Never writes to Production. Optional HEAD checks are best-effort only.
 */

import fs from "node:fs";
import path from "node:path";
import { isRejectedImageUrl } from "../src/lib/news/images/validate";
import { validateImageUrlShape } from "../src/lib/news/images/image-url-validation";
import {
  isExpiredSignedUrl,
  isSupabaseSignedUrl,
  isTrustedImageUrl,
} from "../src/lib/news/images/trusted-remote-hosts";
import { hasAiEditorialHero } from "../src/lib/news/ai/editorial-image-terminal";

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

type IssueCode =
  | "missing_image_url"
  | "malformed_url"
  | "unsupported_host"
  | "expired_signed_url"
  | "brand_or_logo_asset"
  | "placeholder_or_tracking"
  | "rejected_other"
  | "generated_without_accessible_asset"
  | "unreachable";

type AuditIssue = {
  articleId: string;
  headline: string | null;
  url: string | null;
  code: IssueCode;
  detail?: string;
};

type ArticleRow = {
  id: string;
  headline: string | null;
  hero_image_url: string | null;
  editorial_metadata: unknown;
  published_at: string | null;
};

function parseArgs(argv: string[]) {
  const limitIdx = argv.indexOf("--limit");
  const outIdx = argv.indexOf("--out");
  return {
    limit: limitIdx >= 0 ? Number(argv[limitIdx + 1]) || 500 : 500,
    checkReachability: argv.includes("--check-reachability"),
    out:
      outIdx >= 0
        ? argv[outIdx + 1]
        : path.join(ROOT, "reports", `editorial-image-audit-${Date.now()}.json`),
  };
}

function classifyUrl(url: string | null): { code?: IssueCode; detail?: string } {
  if (!url?.trim()) return { code: "missing_image_url" };
  const shape = validateImageUrlShape(url);
  if (!shape.ok) {
    return {
      code: shape.reason === "invalid_url" ? "malformed_url" : "malformed_url",
      detail: shape.reason,
    };
  }
  if (isSupabaseSignedUrl(url) && isExpiredSignedUrl(url)) {
    return { code: "expired_signed_url" };
  }
  if (!isTrustedImageUrl(url)) {
    return { code: "unsupported_host", detail: new URL(url).hostname };
  }
  const rejected = isRejectedImageUrl(url);
  if (rejected.rejected) {
    if (rejected.reason === "brand_asset" || rejected.reason === "logo_or_icon") {
      return { code: "brand_or_logo_asset", detail: rejected.reason };
    }
    if (
      rejected.reason === "placeholder" ||
      rejected.reason === "tracking_pixel" ||
      rejected.reason === "data_uri"
    ) {
      return { code: "placeholder_or_tracking", detail: rejected.reason };
    }
    return { code: "rejected_other", detail: rejected.reason };
  }
  return {};
}

async function fetchArticles(limit: number): Promise<ArticleRow[]> {
  const { createAdminServerClient } = await import("../src/lib/supabase");
  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("generated_articles")
    .select("id, headline, hero_image_url, editorial_metadata, published_at")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as ArticleRow[];
}

async function checkReachable(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return res.ok || res.status === 405;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log("[audit-editorial-images] read-only audit starting…");
  console.log(`  limit=${args.limit} reachability=${args.checkReachability}`);

  const rows = await fetchArticles(args.limit);
  const issues: AuditIssue[] = [];
  const counts: Record<string, number> = {};
  const hostCounts: Record<string, number> = {};

  for (const row of rows) {
    const url = row.hero_image_url;
    if (url) {
      try {
        const h = new URL(url).hostname;
        hostCounts[h] = (hostCounts[h] ?? 0) + 1;
      } catch {
        /* ignore */
      }
    }

    const classified = classifyUrl(url);
    if (classified.code) {
      issues.push({
        articleId: row.id,
        headline: row.headline,
        url,
        code: classified.code,
        detail: classified.detail,
      });
      counts[classified.code] = (counts[classified.code] ?? 0) + 1;
      continue;
    }

    const meta = row.editorial_metadata as { image?: { status?: string } } | null;
    if (
      meta?.image?.status === "queued" ||
      (url &&
        url.includes("editorial-images") === false &&
        !hasAiEditorialHero(row) &&
        meta?.image?.status === "completed")
    ) {
      // Generated claim without accessible storage asset — soft signal
      if (meta?.image?.status === "completed" && url && !url.includes("/storage/")) {
        issues.push({
          articleId: row.id,
          headline: row.headline,
          url,
          code: "generated_without_accessible_asset",
          detail: "completed meta without storage URL",
        });
        counts.generated_without_accessible_asset =
          (counts.generated_without_accessible_asset ?? 0) + 1;
      }
    }

    if (args.checkReachability && url) {
      const ok = await checkReachable(url);
      if (!ok) {
        issues.push({
          articleId: row.id,
          headline: row.headline,
          url,
          code: "unreachable",
        });
        counts.unreachable = (counts.unreachable ?? 0) + 1;
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: "audit-readonly",
    scanned: rows.length,
    issueCount: issues.length,
    counts,
    topHosts: Object.entries(hostCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40),
    issues: issues.slice(0, 2000),
  };

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(report, null, 2), "utf8");

  console.log("[audit-editorial-images] done");
  console.log(`  scanned=${report.scanned} issues=${report.issueCount}`);
  console.log("  counts:", counts);
  console.log(`  report: ${args.out}`);
}

main().catch((err) => {
  console.error("[audit-editorial-images] failed:", err);
  process.exit(1);
});
