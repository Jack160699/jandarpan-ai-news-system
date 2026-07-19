# Remaining Blockers

1. **Scheduled vs live publish** — new quality-approved stories land as `workflow_status=scheduled` / `editorial_status=pending` without immediate `published_at`. Generation yield is restored; public live count may lag until workflow/edition publish advances.
2. **Upstream backlog** — `embed_signals` (~44 pending) and `event_cluster` (~38 pending) still queued; feeder alive but delayed for brand-new clusters.
3. **30–40 published/day** — requires 24–72h observation; not proven from two cron windows.
4. **Step 2 translation recovery** — not started.
