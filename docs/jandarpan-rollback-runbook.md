# Jan Darpan — Rollback runbook

**Rollback tip (pre Reader DS production merge):**  
`rollback/pre-reader-ds-production-20260721-1121` @ `0dc5670b5d99e83c3715f29785615747d6b319be`

## Instant UI rollback (preferred)

Unset Production env `NEXT_PUBLIC_READER_DS` (or set `0`) and redeploy / wait for edge cache. Legacy reader returns without git revert.

## Deployment rollback (preferred for code faults)

1. In Vercel project `newspaper-motion`, open Production deployments  
2. Promote the last known-good Production deployment before the merge SHA  
3. Confirm `www.jandarpan.news` serves the promoted SHA  
4. Verify homepage, story, admin login, cron auth  

## Git rollback (ops only — do not force-push without approval)

```bash
git fetch origin
git checkout main
git reset --hard 0dc5670b5d99e83c3715f29785615747d6b319be
# Prefer revert merge commit over rewrite if main was pushed:
# git revert -m 1 <merge_sha>
git push origin main   # only with explicit approval; never --force to main
```

## Rates / cron

- Provider flags off → cron skips (`providers_not_configured`)  
- `/api/cg-rates` remains retired (503)  
- Empty rate pages remain noindex  

## Database

Do **not** reset Production. Verified-rates tables are additive; leave them in place.
