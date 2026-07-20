# Image Storage Audit

## Intent
Durable storage for editorial images; never persist temporary provider URLs as final heroes.

## Health probe (safe)
Upload uniquely named tiny asset → read → validate MIME/bytes → delete only that asset.

## Kickoff observations
- 7-day published articles with non-null `hero_image_url`: 40/40
- Broken-URL deep validation deferred to Stage 1 image SHADOW scoring (read-only)
- Environment mismatch risk: Preview must not write Preview Supabase URLs into Production articles

## Status
SHADOW — no mass repair executed in foundation PR.
