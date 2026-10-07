/**
 * Read-only SQL through the Supabase CLI direct-SQL path (`supabase db query --linked`).
 * Works while the REST API is restricted (HTTP 402), because it talks to Postgres directly.
 * Only ever pass SELECT statements: callers are audit scripts.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function querySql<T = Record<string, unknown>>(sql: string): T[] {
  if (!/^\s*(with|select)\b/i.test(sql)) throw new Error("querySql is read-only: statement must start with SELECT or WITH");
  const file = path.join(os.tmpdir(), `audit-${process.pid}-${Date.now()}.sql`);
  fs.writeFileSync(file, sql);
  try {
    const out = execFileSync("npx", ["--no-install", "supabase", "db", "query", "--linked", "-f", file, "-o", "json"], {
      encoding: "utf8",
      shell: process.platform === "win32",
      maxBuffer: 64 * 1024 * 1024,
    });
    // The CLI prints an object ({ rows: [...] }) after some banner lines; accept a bare array too.
    const brace = out.indexOf("{");
    const bracket = out.indexOf("[");
    const start = brace !== -1 && (bracket === -1 || brace < bracket) ? brace : bracket;
    const end = out.lastIndexOf(start === brace ? "}" : "]");
    const parsed = JSON.parse(out.slice(start, end + 1));
    return (Array.isArray(parsed) ? parsed : ((parsed as { rows?: unknown[] }).rows ?? [])) as T[];
  } finally {
    fs.rmSync(file, { force: true });
  }
}
