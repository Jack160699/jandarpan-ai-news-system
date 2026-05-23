const PREFIX = "nr-scroll:";

export function saveScrollPosition(path: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${PREFIX}${path}`, String(window.scrollY));
  } catch {
    /* quota / private mode */
  }
}

export function restoreScrollPosition(path: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${path}`);
    if (raw == null) return;
    const y = Number.parseInt(raw, 10);
    if (!Number.isFinite(y) || y <= 0) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, left: 0, behavior: "instant" });
    });
  } catch {
    /* noop */
  }
}

export function clearScrollPosition(path: string): void {
  try {
    sessionStorage.removeItem(`${PREFIX}${path}`);
  } catch {
    /* noop */
  }
}
