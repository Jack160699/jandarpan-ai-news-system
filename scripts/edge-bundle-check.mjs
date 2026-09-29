/**
 * Feasibility check for running the editorial path in a Supabase Edge Function (Deno).
 *   node scripts/edge-bundle-check.mjs src/lib/news/ai/generate-article.ts
 * Bundles the entry with Next-only modules (next/*, sharp, server-only) replaced by stubs and reports the bundle
 * size, the npm packages that end up inside it and any runtime imports that remain external. Read-only: writes nothing.
 * See docs/EDGE_EDITORIAL_WORKER_DESIGN.md.
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

const shim = (name, code) => ({ name, code });
const stubs = {
  "next/server": "export const after = (fn) => { Promise.resolve().then(typeof fn === 'function' ? fn : () => fn); }; export const NextResponse = {};",
  "next/headers": "export const cookies = async () => { throw new Error('cookies() unavailable in Edge worker'); }; export const headers = cookies;",
  "next/cache": "export const revalidateTag = () => {}; export const revalidatePath = () => {}; export const unstable_cache = (fn) => fn;",
  sharp: "export default function sharp() { throw new Error('sharp unavailable in Edge worker'); }",
  "server-only": "export {};",
};

const plugin = {
  name: "edge-shims",
  setup(b) {
    b.onResolve({ filter: /^(next\/.*|sharp|server-only)$/ }, (a) => ({ path: a.path, namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => ({ contents: stubs[a.path] ?? "export default {}", loader: "js" }));
    b.onResolve({ filter: /^@\// }, (a) => {
      const base = path.join(root, "src", a.path.slice(2));
      for (const e of [".ts", ".tsx", "/index.ts", "/index.tsx"]) if (fs.existsSync(base + e)) return { path: base + e };
      return null;
    });
  },
};

const entry = process.argv[2];
const res = await esb.build({
  entryPoints: [entry],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  target: "es2022",
  plugins: [plugin],
  logLevel: "silent",
  metafile: true,
  external: ["node:*", "crypto", "fs", "path", "os", "stream", "buffer", "zlib", "util", "child_process", "net", "tls", "http", "https", "url"],
  minify: true,
}).catch((e) => e);

if (res.errors && res.errors.length) {
  console.log("BUILD ERRORS:", res.errors.length);
  for (const e of res.errors.slice(0, 15)) console.log(" -", e.text, e.location ? `(${e.location.file}:${e.location.line})` : "");
  process.exit(0);
}
const out = res.outputFiles[0];
console.log("bundle KB:", Math.round(out.contents.length / 1024));
const inputs = Object.keys(res.metafile.inputs);
console.log("inputs:", inputs.length);
const pkgs = new Map();
for (const i of inputs) {
  const m = /node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)/.exec(i.replace(/\\/g, "/"));
  if (m) pkgs.set(m[1], (pkgs.get(m[1]) ?? 0) + 1);
}
console.log("npm packages bundled:", [...pkgs.keys()].join(", "));
const bare = new Set();
for (const o of Object.values(res.metafile.outputs)) for (const im of o.imports) bare.add(im.path);
console.log("external runtime imports:", [...bare].join(", "));
