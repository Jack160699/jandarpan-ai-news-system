/**
 * Article claim evidence ledger — track supported vs unsupported claims.
 */

import type {
  ArticleEvidenceLedger,
  ClaimEvidence,
} from "@/lib/autonomous/types";

export type { ArticleEvidenceLedger, ClaimEvidence };

export function createEmptyLedger(articleId: string): ArticleEvidenceLedger {
  return {
    articleId,
    claims: [],
    updatedAt: new Date().toISOString(),
  };
}

export function recordClaim(
  ledger: ArticleEvidenceLedger,
  claim: Omit<ClaimEvidence, "recordedAt"> & { recordedAt?: string }
): ArticleEvidenceLedger {
  const next: ClaimEvidence = {
    ...claim,
    recordedAt: claim.recordedAt ?? new Date().toISOString(),
  };
  const without = ledger.claims.filter((c) => c.claimId !== next.claimId);
  return {
    ...ledger,
    claims: [...without, next],
    updatedAt: new Date().toISOString(),
  };
}

export function removeUnsupportedClaims(
  ledger: ArticleEvidenceLedger
): ArticleEvidenceLedger {
  return {
    ...ledger,
    claims: ledger.claims.filter((c) => c.supported),
    updatedAt: new Date().toISOString(),
  };
}

export function listUnsupportedClaims(
  ledger: ArticleEvidenceLedger
): ClaimEvidence[] {
  return ledger.claims.filter((c) => !c.supported);
}

export function hasUnsupportedClaims(ledger: ArticleEvidenceLedger): boolean {
  return ledger.claims.some((c) => !c.supported);
}
