/** Browser-only helpers — never call storage/clipboard APIs during SSR. */

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readStorage(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore quota / privacy mode
  }
}

let idCounter = 0;

export function createAiId(): string {
  if (isBrowser() && typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  idCounter += 1;
  return `ai-${Date.now()}-${idCounter}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!isBrowser()) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  return false;
}
