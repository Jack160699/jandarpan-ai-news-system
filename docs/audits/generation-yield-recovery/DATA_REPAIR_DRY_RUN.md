# Data Repair Dry Run

Primary fix is code-path selection. Fresh-window events already resolve signals.

## Dry-run (SQL / tooling equivalent)

Top-100 non-live events older than 72h (urgency-ranked sample):

| Metric | Value |
|---|---|
| Sample size | 100 |
| Obsolete dangling (`listed>0`, `found=0`) | 16 |
| Already quarantined | 0 |

No invented relationships proposed.

## Tool

```bash
npm run ops:generation-yield-repair -- audit
npm run ops:generation-yield-repair -- quarantine-obsolete
```

Local execute blocked in this environment by empty Supabase URL/service key in `.env*`; equivalent bounded quarantine executed via Supabase MCP SQL (see `DATA_REPAIR_EXECUTION.md`).
