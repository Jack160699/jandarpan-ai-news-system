/**
 * Backfill generated_articles that were created while auto-publish was off
 * or stuck in draft workflow despite passing editorial quality.
 *
 * Usage:
 *   NEWSROOM_AUTO_PUBLISH=true node scripts/backfill-generated-publication.mjs
 *   NEWSROOM_AUTO_PUBLISH=true node scripts/backfill-generated-publication.mjs --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i < 1) continue;
      const key = line.slice(0, i);
      const val = line.slice(i + 1);
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const dryRun = process.argv.includes("--dry-run");
const days = Number(process.env.BACKFILL_DAYS ?? 7);

if (process.env.NEWSROOM_AUTO_PUBLISH !== "true") {
  console.error(
    "Refusing to run: set NEWSROOM_AUTO_PUBLISH=true (safety gate for production backfill)."
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const now = new Date().toISOString();

async function main() {
  const { data: recentPending, error: recentErr } = await supabase
    .from("generated_articles")
    .select("id, slug, headline, editorial_status, workflow_status, published_at, created_at")
    .gte("created_at", since)
    .is("published_at", null)
    .in("editorial_status", ["pending", "draft"]);

  if (recentErr) {
    console.error("Query failed:", recentErr.message);
    process.exit(1);
  }

  const { data: workflowStuck, error: stuckErr } = await supabase
    .from("generated_articles")
    .select("id, slug, headline, editorial_status, workflow_status, published_at, created_at")
    .not("published_at", "is", null)
    .in("editorial_status", ["approved", "published", "live"])
    .neq("workflow_status", "published");

  if (stuckErr) {
    console.error("Workflow query failed:", stuckErr.message);
    process.exit(1);
  }

  const byId = new Map();
  for (const row of [...(recentPending ?? []), ...(workflowStuck ?? [])]) {
    byId.set(row.id, row);
  }
  const targets = [...byId.values()];

  console.log(
    JSON.stringify(
      {
        dryRun,
        since,
        targets: targets.length,
        recentUnpublished: recentPending?.length ?? 0,
        workflowStuck: workflowStuck?.length ?? 0,
      },
      null,
      2
    )
  );

  if (!targets.length) {
    console.log("Nothing to backfill.");
    return;
  }

  for (const row of targets.slice(0, 10)) {
    console.log(
      `  - ${row.id.slice(0, 8)}… ${row.headline?.slice(0, 50) ?? row.slug} | es=${row.editorial_status} wf=${row.workflow_status} pub=${row.published_at ?? "null"}`
    );
  }
  if (targets.length > 10) console.log(`  … and ${targets.length - 10} more`);

  if (dryRun) {
    console.log("Dry run — no rows updated.");
    return;
  }

  let updated = 0;
  for (const row of targets) {
    const patch = {
      editorial_status: "approved",
      published_at: row.published_at ?? now,
      workflow_status: "published",
      reviewed_at: now,
    };

    const { error } = await supabase
      .from("generated_articles")
      .update(patch)
      .eq("id", row.id);

    if (error) {
      console.error(`Failed ${row.id}:`, error.message);
      continue;
    }
    updated += 1;
  }

  const { count: poolCount } = await supabase
    .from("generated_articles")
    .select("id", { count: "exact", head: true })
    .not("published_at", "is", null)
    .in("editorial_status", ["approved", "published", "live"]);

  const { data: newest } = await supabase
    .from("generated_articles")
    .select("id, slug, headline, editorial_status, workflow_status, published_at, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log(
    JSON.stringify(
      {
        updated,
        homepageEligibleCount: poolCount,
        newest,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
