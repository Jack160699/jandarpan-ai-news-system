# Image Provider Audit

## Configured provider
- OpenAI (DALL·E path via `editorial-image-provider.ts`)
- Gate: `NEWSROOM_EDITORIAL_IMAGES` + `OPENAI_API_KEY`

## Behavior notes
- Provider returns temporary URLs — must download into Jan Darpan storage before completion
- Failure path must fall back to category/region/branded assets without blocking publish
- Commercial-use suitability: verify OpenAI Terms for production news illustrations (account-level)

## Credentials
Values not recorded. Presence only verified via Vercel env inventory (Encrypted).

## Fallback state when provider unavailable
source → category curated → region curated → branded placeholder
