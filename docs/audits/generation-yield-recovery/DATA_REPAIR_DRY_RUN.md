# Data Repair Dry Run

Primary fix is **code-path selection**, not relationship invention. Fresh 7d events already have resolvable `signal_ids` (799/799).

## Tool

```bash
npm run ops:generation-yield-repair -- audit
npm run ops:generation-yield-repair -- quarantine-obsolete
```

Dry-run by default. `--execute` required for metadata quarantine.

## Expected dry-run actions

- List high-urgency events outside the auto window with dangling signal IDs
- Propose `clustering_metadata.generation_yield_quarantine` annotation
- Never attach invented signals
- Never delete rows
- Never force-publish

## Note

Execute only after production deploy of the selection fix, in a small batch, so quarantine does not mask the yield recovery signal.
