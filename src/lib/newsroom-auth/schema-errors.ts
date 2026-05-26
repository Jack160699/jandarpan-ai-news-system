/**
 * PostgREST / Supabase schema cache error detection for graceful admin UX.
 */

const SCHEMA_PATTERNS = [
  "schema cache",
  "could not find",
  "column",
  "pgrst",
  "42703",
] as const;

export function isPostgrestSchemaError(message?: string | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return SCHEMA_PATTERNS.some((p) => m.includes(p));
}

export function formatTeamApiError(error?: string | null): string {
  if (!error) return "Request failed";
  if (isPostgrestSchemaError(error)) {
    return "Database schema is out of date. Apply migration 034_production_schema_stabilization.sql in Supabase, reload PostgREST schema, then retry.";
  }
  return error;
}
