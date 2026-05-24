/**
 * Filter test/placeholder copy from homepage surfaces (tickers, marquees, topics).
 */

export function isPlaceholderContent(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2) return true;
  if (/^(abc)+$/i.test(trimmed)) return true;
  if (/abc{3,}/i.test(trimmed.replace(/\s/g, ""))) return true;
  if (/^(.)\1{5,}$/i.test(trimmed.replace(/\s/g, ""))) return true;
  return false;
}

export function filterPlaceholderStrings(items: string[]): string[] {
  return items.filter((item) => !isPlaceholderContent(item));
}
