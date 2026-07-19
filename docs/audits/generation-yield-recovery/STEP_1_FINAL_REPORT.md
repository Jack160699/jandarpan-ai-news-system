# Step 1 Final Report — Generation Yield Recovery

## Verdict

_Pending production verification after deploy._

## Root cause

Global urgency-ranked candidate selection preferred stale events whose `signal_ids` no longer resolve in `news_signals`, causing batch skips (`generated=0`) despite hundreds of fresh resolvable events.

## Fix

Freshness-windowed selection + resolvable-signal prefilter + age demotion + skip classification + quarantine tooling.

## Delivery

See `DEPLOYMENT.md` and `PRODUCTION_VERIFICATION.md` for SHA / deploy / evidence after push.
