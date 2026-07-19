# Admin Performance Final

## Before → after (Phase 3)

| Concern | Before | After |
|---|---|---|
| Global editorial fetch on every admin route | Yes | Removed / route-scoped |
| Health polling | Aggressive multi-source | Canonical summary + progressive diagnostics |
| Notification polling | Heavy / undeduped | Deduped feed + bounded poll |
| Command Centre | Parallel noisy fetches | Contracted overview daily payload |

## Phase 6

- No new polling loops introduced
- Motion kept to 120–220ms; reduced-motion respected
- Production build may still fail on public prerender paths unrelated to admin

## Production (Phase 6)

- Deployed commit `efe2d6b` as `dpl_X8sUsK6wMeukDdN2UhXKQAZMP2pp` (`READY`)
- No new admin runtime error clusters in 24h window after deploy
- Authenticated wall-clock timings still blocked without production password credentials

## Residual

- Historical local `npm run build` prerender issues on public `/category/*`, `/district/*` were out of admin scope; Vercel production deploy for this SHA reached `READY`)

