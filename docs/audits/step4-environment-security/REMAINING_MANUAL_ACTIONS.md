# Remaining Manual Actions

## Required for Production Step 4
**None.**

## Optional / non-blocking
1. Propagate Step 4 Preview secrets to **all** Preview branches if desired (CLI non-interactive all-Preview add hits git_branch_required; branch-specific vars exist for fix/step4-environment-security-hardening).
2. When ready to isolate cron scopes further, update QStash / GitHub Actions / Vercel Cron architecture — Vercel Cron cannot send per-route secrets today, so legacy CRON_SECRET must remain.
3. Orphan GitHub status `Vercel – jandarpan-ai-news-system` remains Case A (ignore).