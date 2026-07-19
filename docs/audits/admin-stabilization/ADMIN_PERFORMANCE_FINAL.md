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

## Residual

- Public site prerender errors (`/category/*`, `/district/*`) remain outside admin scope
