/**
 * Agent 7 handoff — reader_profiles migration (NOT applied by Agent 6)
 *
 * Migration file:
 *   supabase/migrations/20260721133000_068_reader_profiles.sql
 *
 * What it adds:
 * - public.reader_profiles (editable display_name/avatar_url + provider_* snapshot)
 * - RLS: authenticated SELECT/INSERT/UPDATE own row only; service_role all
 * - Optional storage bucket reader-avatars with per-user folder RLS (skipped if storage unavailable)
 *
 * Apply steps (Agent 7 only):
 * 1. Review SQL in staging
 * 2. `npx supabase db push --linked` (or project-approved migrate path)
 * 3. Confirm Google provider + redirect allowlist includes `/auth/callback`
 * 4. Confirm bucket `reader-avatars` exists (or create manually if DO block skipped)
 * 5. Regenerate types if needed: `npm run supabase:types`
 *
 * Do not roll back prior migrations. Forward-only.
 */
