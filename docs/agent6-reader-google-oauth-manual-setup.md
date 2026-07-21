# Manual external setup â€” reader Google OAuth (Agent 6)

Application code is ready. **Do not invent credentials.** Confirm the following in Google Cloud + Supabase + Vercel (ops / Agent 7).

## Likely required

1. **Google Cloud OAuth client** (Web application)
   - Authorized JavaScript origins: production origin + preview origins as needed
   - Authorized redirect URIs: Supabase callback
     `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
2. **OAuth consent screen** configured (External or Internal); add test users if app is in Testing
3. **Supabase Auth â†’ Providers â†’ Google** enabled with Client ID + Client Secret (dashboard only)
4. **Supabase Auth â†’ URL configuration**
   - Site URL: production domain
   - Redirect allowlist must include:
     - `https://<PRODUCTION_DOMAIN>/auth/callback`
     - `https://<PRODUCTION_DOMAIN>/login` (legacy compatibility)
     - local: `http://localhost:3000/auth/callback`
5. **Vercel Production / Preview env** (names only; never commit values):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_READER_DS=1` for More hub account card
6. **Agent 7 migration** `20260721133000_068_reader_profiles.sql` before remote profile sync works
7. Confirm **reader-avatars** storage bucket after migration (optional DO block may skip)

## Not required for guest reading

Login is optional. News remains readable without Google sign-in.
