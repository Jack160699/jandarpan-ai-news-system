/**
 * Strict Supabase-Edge (Deno) compatibility check for a generation entry point. NO stubs.
 *
 *   node scripts/edge-bundle-check.mjs [entry]         (default: src/edge/editorial-worker/serve.ts)
 *
 * It bundles the entry with esbuild, resolving only the `@/` alias and the explicit runtime ports in
 * `src/lib/runtime/*.edge.ts`. Then it FAILS (exit 1) if the bundle graph still reaches anything the Edge runtime
 * cannot run - Next.js APIs, sharp / native modules, filesystem access, bare Node builtins - and prints the import
 * chain that pulls each offender in so it can be isolated properly instead of stubbed.
 *
 * It also reports (informational): process.env variable names read, node: builtins used, dynamic imports.
 * Read-only: writes nothing unless --out <file> is given.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const req = createRequire(path.join(root, "package.json"));
const pnpmDir = path.join(root, "node_modules/.pnpm");
const esbDir = fs.readdirSync(pnpmDir).find((d) => d.startsWith("esbuild@"));
if (!esbDir) throw new Error("esbuild not found in node_modules/.pnpm (installed with vite/vitest)");
const esb = req(path.join(pnpmDir, esbDir, "node_modules/esbuild"));

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outFile = outIdx >= 0 ? args[outIdx + 1] : null;
const impIdx = args.indexOf("--importers");
const importersOf = impIdx >= 0 ? args[impIdx + 1] : null;
const chainIdx = args.indexOf("--chain");
const chainTarget = chainIdx >= 0 ? args[chainIdx + 1] : null;
const entry = args.find((a, i) => !a.startsWith("--") && (outIdx < 0 || i !== outIdx + 1) && (impIdx < 0 || i !== impIdx + 1) && (chainIdx < 0 || i !== chainIdx + 1)) ?? "src/edge/editorial-worker/serve.ts";

/** Node builtins the Supabase Edge runtime provides through its node: compatibility layer. */
const ALLOWED_NODE_BUILTINS = new Set(["node:async_hooks", "node:crypto", "node:buffer"]);
/** Never acceptable in the bundle graph. */
const FORBIDDEN = [
  { re: /^next(\/|$)/, why: "Next.js API (not available outside the Next runtime)" },
  { re: /^sharp$/, why: "native module (libvips) - cannot run in Edge" },
  { re: /^server-only$/, why: "Next build-time marker" },
  { re: /^@supabase\/ssr$/, why: "cookie/Next session helper" },
  { re: /^(fs|node:fs|fs\/promises|node:fs\/promises|child_process|node:child_process|worker_threads|node:worker_threads|net|node:net)$/, why: "filesystem/process/network primitive" },
];

const EDGE_PORTS = {
  "@/lib/runtime/background": "src/lib/runtime/background.edge.ts",
  "@/lib/supabase": "src/lib/runtime/supabase.edge.ts",
};

function resolveAlias(spec) {
  const base = path.join(root, "src", spec.slice(2));
  for (const e of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (fs.existsSync(base + e) && fs.statSync(base + e).isFile()) return base + e;
  }
  return null;
}

const plugin = {
  name: "edge-alias",
  setup(b) {
    b.onResolve({ filter: /^@\// }, (a) => {
      if (EDGE_PORTS[a.path]) return { path: path.join(root, EDGE_PORTS[a.path]) };
      const p = resolveAlias(a.path);
      return p ? { path: p } : null;
    });
  },
};

const build = await esb
  .build({
    entryPoints: [path.join(root, entry)],
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
    target: "es2022",
    plugins: [plugin],
    logLevel: "silent",
    metafile: true,
    minify: true,
    // next/*, sharp etc. are left external ON PURPOSE so the audit can see and report them (no stubbing).
    external: ["next", "next/*", "sharp", "server-only", "node:*", "fs", "path", "os", "crypto", "child_process", "net", "tls", "http", "https", "zlib", "stream", "util", "buffer", "url"],
  })
  .catch((e) => e);

if (build.errors && build.errors.length) {
  console.log("BUILD ERRORS:");
  for (const e of build.errors.slice(0, 20)) console.log(" -", e.text, e.location ? `(${e.location.file}:${e.location.line})` : "");
  process.exit(1);
}

const meta = build.metafile;
// import graph: input file -> [{path, external}]
const graph = new Map();
for (const [file, info] of Object.entries(meta.inputs)) graph.set(file, info.imports);
const entryKey = Object.keys(meta.inputs).find((k) => k.replace(/\\/g, "/").endsWith(entry.replace(/\\/g, "/")));

function chainTo(target) {
  const prev = new Map([[entryKey, null]]);
  const q = [entryKey];
  while (q.length) {
    const f = q.shift();
    for (const im of graph.get(f) ?? []) {
      if (im.external && im.path === target) {
        const chain = [target];
        for (let cur = f; cur; cur = prev.get(cur)) chain.unshift(cur.replace(/\\/g, "/"));
        return chain;
      }
      if (!im.external && graph.has(im.path) && !prev.has(im.path)) {
        prev.set(im.path, f);
        q.push(im.path);
      }
    }
  }
  return null;
}

if (chainTarget) {
  // --chain <path-substring>: shortest import chain from the entry to a bundled internal module.
  const norm = (p) => p.split("\\").join("/");
  const prev = new Map([[entryKey, null]]);
  const q = [entryKey];
  let found = null;
  while (q.length && !found) {
    const f = q.shift();
    for (const im of graph.get(f) ?? []) {
      if (im.external || !graph.has(im.path) || prev.has(im.path)) continue;
      prev.set(im.path, f);
      if (norm(im.path).includes(chainTarget)) { found = im.path; break; }
      q.push(im.path);
    }
  }
  if (!found) console.log("not reachable");
  else { const c = []; for (let cur = found; cur; cur = prev.get(cur)) c.unshift(norm(cur)); console.log(c.join("\n  -> ")); }
  process.exit(0);
}

if (importersOf) {
  // --importers <path-substring>: list every bundled file that imports a matching module (direct importers only).
  const needle = importersOf.split("\\").join("/");
  for (const [file, imports] of graph) {
    const hits = imports.filter((im) => im.path.split("\\").join("/").includes(needle));
    if (hits.length) console.log(file.split("\\").join("/"));
  }
  process.exit(0);
}

const externals = new Set();
for (const imports of graph.values()) for (const im of imports) if (im.external) externals.add(im.path);

const problems = [];
for (const ext of externals) {
  const bad = FORBIDDEN.find((f) => f.re.test(ext));
  const bareBuiltin = !ext.startsWith("node:") && !bad && /^(crypto|path|os|stream|util|zlib|http|https|tls|url|buffer)$/.test(ext);
  if (bad) problems.push({ ext, why: bad.why });
  else if (bareBuiltin) problems.push({ ext, why: "bare Node builtin - use the node: prefix" });
  else if (ext.startsWith("node:") && !ALLOWED_NODE_BUILTINS.has(ext)) problems.push({ ext, why: "node: builtin outside the audited allow-list" });
}

// Source-level scan of everything that ended up in the bundle.
const envVars = new Set();
const dynamicImports = [];
const suspicious = [];
for (const file of Object.keys(meta.inputs)) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs) || abs.includes("node_modules")) continue;
  const text = fs.readFileSync(abs, "utf8");
  for (const m of text.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)|process\.env\[["']([A-Z][A-Z0-9_]+)["']\]/g)) envVars.add(m[1] ?? m[2]);
  for (const m of text.matchAll(/\bimport\(\s*([^)]+)\)/g)) dynamicImports.push(`${file.replace(/\\/g, "/")}: import(${m[1].trim()})`);
  if (/\brequire\(/.test(text)) suspicious.push(`${file.replace(/\\/g, "/")}: require()`);
  if (/\beval\(|new Function\(/.test(text)) suspicious.push(`${file.replace(/\\/g, "/")}: eval/new Function`);
  if (/\bBuffer\./.test(text) && !/from "node:buffer"/.test(text)) suspicious.push(`${file.replace(/\\/g, "/")}: Buffer (global; needs node:buffer or Uint8Array)`);
}

const out = build.outputFiles[0];
console.log(`entry: ${entry}`);
console.log(`bundle: ${Math.round(out.contents.length / 1024)} KB, ${Object.keys(meta.inputs).length} inputs (limit 20 MB)`);
console.log(`node: builtins used: ${[...externals].filter((e) => e.startsWith("node:")).sort().join(", ") || "(none)"}`);
console.log(`npm packages inside bundle: ${[...new Set(Object.keys(meta.inputs).map((i) => /node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)/.exec(i.replace(/\\/g, "/"))?.[1]).filter(Boolean))].sort().join(", ")}`);
if (args.includes("--env-names")) console.log(`process.env names read (${envVars.size}): ${[...envVars].sort().join(" ")}`); else console.log(`process.env names read: ${envVars.size} (use --env-names to list)`);
console.log(`dynamic imports (${dynamicImports.length}):${dynamicImports.length ? "\n  " + dynamicImports.join("\n  ") : " none"}`);
if (suspicious.length) console.log(`review:\n  ${suspicious.join("\n  ")}`);

if (outFile) {
  fs.writeFileSync(outFile, out.contents);
  console.log(`wrote ${outFile}`);
}

if (problems.length) {
  console.log(`\nINCOMPATIBLE (${problems.length}):`);
  for (const p of problems) {
    console.log(` x ${p.ext} - ${p.why}`);
    const chain = chainTo(p.ext);
    if (chain) console.log("     " + chain.join("\n       -> "));
  }
  process.exit(1);
}
console.log("\nOK: no Edge-incompatible modules reachable from the entry.");
