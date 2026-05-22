/**
 * Typo-tolerant token matching (edit distance)
 */

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min(
        row[j] + 1,
        prev + 1,
        row[j - 1] + cost
      );
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }

  return row[b.length];
}

export function fuzzyTokenMatch(queryToken: string, indexToken: string): boolean {
  if (queryToken === indexToken) return true;
  if (queryToken.length < 3 || indexToken.length < 3) return false;

  const maxDist =
    queryToken.length <= 4 ? 1 : queryToken.length <= 7 ? 2 : 2;

  return levenshtein(queryToken, indexToken) <= maxDist;
}

export function expandFuzzyTokens(
  queryToken: string,
  vocabulary: Set<string>
): string[] {
  const matches = new Set<string>();
  if (vocabulary.has(queryToken)) matches.add(queryToken);

  for (const vocab of vocabulary) {
    if (fuzzyTokenMatch(queryToken, vocab)) {
      matches.add(vocab);
    }
  }

  return [...matches];
}
