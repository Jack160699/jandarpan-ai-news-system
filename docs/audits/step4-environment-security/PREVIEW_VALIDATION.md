# PREVIEW_VALIDATION

**Step:** 4 — Environment & Security Hardening  
**Verdict for Preview env parity:** **PARTIAL**

## Blockers

| Issue | Detail |
|---|---|
| All-Preview scoped/2FA/`AI_LOCAL` add | Blocked by Vercel CLI `git_branch_required` quirk in non-interactive mode |
| Branch-specific Preview env add | Failed because working branch not yet pushed |
| Hardening target | **Production** (intentional for this step) |

## Preview status placeholders

| Item | Status |
|---|---|
| Preview URL | **TBD** (after branch push + PR / deploy) |
| Preview scoped cron secrets | Not fully provisioned |
| Preview `SECURITY_2FA_ENCRYPTION_KEY` | Not fully provisioned |
| Preview `AI_LOCAL_ENRICH_ENABLED` | Not fully provisioned |
| Preview Redis URL/TOKEN | Configured (Encrypted ~17d; unchanged) |

## What Preview can still validate (once deploy exists)

- Code compile / CI unit tests for cron-auth + two-factor.
- Behavioral dual-accept cron auth with whatever secrets Preview has (`CRON_SECRET` if present).
- Do **not** expect full Production-parity env warnings to clear on Preview until env parity work is done.

## Required follow-up for Preview parity

1. Push `fix/step4-environment-security-hardening`.
2. Open PR (**PR number TBD**).
3. Add Preview (or branch) env vars via dashboard or interactive CLI:
   - scoped `CRON_*_SECRET`s
   - `SECURITY_2FA_ENCRYPTION_KEY`
   - `AI_LOCAL_ENRICH_ENABLED` (explicit false)
4. Redeploy Preview and re-check `/api/health` warnings.

## Note

Production remains the Step 4 hardening target. Preview gap is documented as a remaining limitation, not a Production rollback trigger by itself.
