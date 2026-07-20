#!/usr/bin/env node
/**
 * Authenticated Preview markup verification via `vercel curl`.
 *
 * Confirms Reader DS markers on a Ready Preview without anonymous HTTP
 * (which hits Vercel SSO and must not be treated as a UI failure).
 *
 * Usage:
 *   node scripts/verify-preview-markup-vercel-curl.mjs --deployment dpl_... --sha 02c69d8
 *
 * Exit codes:
 *   0  All required markers found
 *   2  Marker missing (product/deploy content issue)
 *   3  SSO / auth / fetch infrastructure failure
 *   4  Usage / SHA mismatch
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function parseArgs(argv) {
  const out = {
    deployment: "",
    sha: "",
    scope: "jack160699s-projects",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--deployment") out.deployment = String(argv[++i] || "").trim();
    else if (a === "--sha") out.sha = String(argv[++i] || "").trim();
    else if (a === "--scope") out.scope = String(argv[++i] || "").trim();
  }
  return out;
}

function run(cmdline) {
  return execSync(cmdline, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function looksLikeVercelSso(html) {
  const h = String(html || "");
  if (!h) return true;
  if (/data-dpl-id=.*\bdash\b/i.test(h) && /vercel/i.test(h) && !/jd-ds|jd-reader-ds|data-testid="jd-reader-ds"/i.test(h)) {
    return true;
  }
  if (/Vercel Authentication|vercel\.com\/login|Authentication Required/i.test(h) && !/jd-ds|data-testid="jd-reader-ds"/i.test(h)) {
    return true;
  }
  return false;
}

function fetchPath(deployment, route, scope) {
  const tmp = path.join(os.tmpdir(), `jd-preview-${Date.now()}-${Math.random().toString(16).slice(2)}.html`);
  try {
    const q = (s) => `"${String(s).replace(/"/g, '\\"')}"`;
    // Do not pass --scope after vercel curl flags; linked project context is used.
    // Keep curl args strictly after `--`.
    run(
      `npx vercel curl ${q(route)} --deployment ${q(deployment)} --yes -- -o ${q(tmp)} -sS -L`
    );
    return fs.readFileSync(tmp, "utf8");
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

function has(html, re) {
  return re.test(html);
}

function main() {
  const opts = parseArgs(process.argv);
  if (!opts.deployment) {
    console.error("USAGE: node scripts/verify-preview-markup-vercel-curl.mjs --deployment <dpl_or_url> [--sha <sha>]");
    process.exit(4);
  }

  if (opts.sha) {
    const key = opts.deployment.replace(/^https?:\/\//, "");
    const raw = run(`npx vercel api "/v13/deployments/${encodeURIComponent(key)}" --scope ${opts.scope}`);
    const j = JSON.parse(raw.slice(raw.indexOf("{")));
    const deploySha = j?.gitSource?.sha || j?.meta?.githubCommitSha || "";
    const ok =
      String(deploySha).toLowerCase().startsWith(String(opts.sha).toLowerCase()) ||
      String(opts.sha).toLowerCase().startsWith(String(deploySha).toLowerCase().slice(0, opts.sha.length));
    if (!ok) {
      console.log(
        JSON.stringify({
          event: "sha_mismatch",
          expected: opts.sha,
          actual: deploySha,
          classification: "wrong_deployment",
          productRegression: false,
        })
      );
      process.exit(4);
    }
    console.log(JSON.stringify({ event: "sha_ok", sha: deploySha, deployment: j.id || opts.deployment }));
  }

  /** @type {Array<{ name: string; route: string; markers: RegExp[] }>} */
  const checks = [
    {
      name: "home_shell_ads",
      route: "/",
      markers: [/data-testid="jd-reader-ds"|class="[^"]*jd-ds/, /data-testid="jd-reserved-ad"|data-jd-ad-placement=/],
    },
    {
      name: "search_filter_rail",
      route: "/search?q=test",
      markers: [
        /data-testid="jd-reader-ds"|class="[^"]*jd-ds/,
        /data-testid="jd-search-filter-rail"|class="[^"]*jd-search-filter-rail/,
        /data-testid="jd-search-results-column"|class="[^"]*jd-search-main/,
      ],
    },
    {
      name: "login_two_panel",
      route: "/login",
      markers: [
        /data-testid="jd-reader-ds"|class="[^"]*jd-ds/,
        /data-testid="jd-login-two-panel"|class="[^"]*jd-signin-card/,
        /data-testid="jd-login-brand-panel"|class="[^"]*jd-signin-brand-panel/,
        /data-testid="jd-login-auth-panel"|class="[^"]*jd-signin-form-panel/,
      ],
    },
    {
      name: "category_side_rail",
      route: "/category/politics",
      markers: [
        /data-testid="jd-reader-ds"|class="[^"]*jd-ds/,
        /data-testid="jd-category-side-rail"|class="[^"]*jd-category-rail/,
        /data-jd-ad-placement="category\.skyscraper"|jd-reserved-ad--skyscraper/,
      ],
    },
    {
      name: "photo_thumbnail_rail",
      route: "/system/preview?state=photo",
      markers: [
        /data-testid="jd-reader-ds"|class="[^"]*jd-photo-story/,
        /data-testid="jd-photo-thumbnail-rail"|class="[^"]*jd-photo-story__thumbs/,
      ],
    },
    {
      name: "account_nav_rail",
      route: "/archive",
      markers: [
        /data-testid="jd-reader-ds"|class="[^"]*jd-ds/,
        /data-testid="jd-account-nav-rail"|class="[^"]*jd-account-nav/,
      ],
    },
  ];

  const results = [];
  for (const check of checks) {
    let html = "";
    try {
      html = fetchPath(opts.deployment, check.route, opts.scope);
    } catch (e) {
      console.log(
        JSON.stringify({
          event: "fetch_error",
          check: check.name,
          route: check.route,
          classification: "preview_auth_or_cli_failure",
          productRegression: false,
          message: e instanceof Error ? e.message : String(e),
        })
      );
      process.exit(3);
    }

    if (looksLikeVercelSso(html)) {
      console.log(
        JSON.stringify({
          event: "blocked_by_vercel_sso",
          check: check.name,
          route: check.route,
          classification: "preview_authentication_sso_limitation",
          productRegression: false,
          note: "Unauthenticated/SSO HTML must not be reported as missing Reader DS markup.",
        })
      );
      process.exit(3);
    }

    const missing = check.markers.filter((re) => !has(html, re)).map((re) => String(re));
    results.push({
      check: check.name,
      route: check.route,
      ok: missing.length === 0,
      missing,
      bytes: html.length,
    });
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    JSON.stringify(
      {
        event: failed.length ? "markup_incomplete" : "markup_ok",
        deployment: opts.deployment,
        productRegression: failed.length > 0,
        results,
      },
      null,
      2
    )
  );
  process.exit(failed.length ? 2 : 0);
}

main();
