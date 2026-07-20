# Evidence Ledger

`src/lib/autonomous/evidence-ledger.ts` + table `article_evidence_ledger`.

## Types

- `ClaimEvidence`: claimId, claimText, sourceUrls, supported, notes, recordedAt
- `ArticleEvidenceLedger`: articleId, claims[], updatedAt

## Helpers

- `createEmptyLedger(articleId)`
- `recordClaim(ledger, claim)` — upsert by claimId
- `removeUnsupportedClaims(ledger)` — drop `supported: false`

Used to strip unsupported statements before autonomous publish (stage_1+).
