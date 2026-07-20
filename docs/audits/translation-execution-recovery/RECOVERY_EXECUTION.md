# Recovery Execution

Status: **pending post-deploy verification**

Plan after READY:

1. Confirm cron logs show `processed > 0` on new release
2. Optionally bump remaining pending priorities to 9 via bounded SQL if needed
3. Allow 2+ scheduled runs (`:10` / `:40`)
4. If completions stall, invoke forceProcess with `processLimit=5` via authenticated cron (no blind full reset)
5. Stop if failure rate elevated or provider quota errors

Metrics to record:

- before pending / after pending
- completed / failed / quarantined
- oldest age
- coverage before/after
- Step 1 articles gaining EN
