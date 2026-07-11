/**
 * Deduplicate rows before bulk upsert — prevents Postgres 21000
 * ("ON CONFLICT DO UPDATE command cannot affect row a second time")
 */

export type BatchDedupeResult<T> = {
  rows: T[];
  duplicateCount: number;
  conflictKey: string;
  duplicateKeys: string[];
};

function defaultPick<T extends Record<string, unknown>>(
  existing: T,
  candidate: T
): T {
  const existingPublished = Date.parse(String(existing.published_at ?? ""));
  const candidatePublished = Date.parse(String(candidate.published_at ?? ""));
  if (
    Number.isFinite(candidatePublished) &&
    (!Number.isFinite(existingPublished) ||
      candidatePublished > existingPublished)
  ) {
    return candidate;
  }

  const existingRichness =
    String(existing.description ?? "").length +
    String(existing.content ?? "").length +
    String(existing.raw_content ?? "").length;
  const candidateRichness =
    String(candidate.description ?? "").length +
    String(candidate.content ?? "").length +
    String(candidate.raw_content ?? "").length;

  return candidateRichness > existingRichness ? candidate : existing;
}

export function dedupeRowsByConflictKey<T extends Record<string, unknown>>(
  rows: T[],
  options: {
    key: keyof T & string;
    canonicalize?: (value: string) => string;
    pick?: (existing: T, candidate: T) => T;
  }
): BatchDedupeResult<T> {
  const { key, canonicalize, pick = defaultPick } = options;
  const byKey = new Map<string, T>();
  const duplicateKeys: string[] = [];

  for (const row of rows) {
    const raw = row[key];
    if (raw == null || String(raw).trim() === "") {
      continue;
    }
    const conflictValue = canonicalize
      ? canonicalize(String(raw))
      : String(raw).trim();

    const existing = byKey.get(conflictValue);
    if (existing) {
      duplicateKeys.push(conflictValue);
      byKey.set(conflictValue, pick(existing, row));
      continue;
    }
    byKey.set(conflictValue, { ...row, [key]: conflictValue } as T);
  }

  return {
    rows: [...byKey.values()],
    duplicateCount: duplicateKeys.length,
    conflictKey: key,
    duplicateKeys: duplicateKeys.slice(0, 20),
  };
}
