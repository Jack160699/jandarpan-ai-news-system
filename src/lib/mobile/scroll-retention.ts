const PREFIX = "nr-scroll:";
const livePositions = new Map<string, number>();

export function recordScrollPosition(path: string, y: number): void {
  if (!path || !Number.isFinite(y)) return;
  livePositions.set(path, Math.max(0, Math.round(y)));
}

export function getRecordedScrollPosition(path: string): number | null {
  const y = livePositions.get(path);
  return y != null && y > 0 ? y : null;
}

export function saveScrollPosition(path: string, y?: number): void {
  if (typeof window === "undefined" || !path) return;
  const scrollY =
    y ?? livePositions.get(path) ?? Math.max(0, Math.round(window.scrollY));
  recordScrollPosition(path, scrollY);
  try {
    sessionStorage.setItem(`${PREFIX}${path}`, String(scrollY));
  } catch {
    /* quota / private mode */
  }
}

function readStoredPosition(path: string): number | null {
  try {
    const fromMemory = livePositions.get(path);
    const raw =
      fromMemory != null
        ? String(fromMemory)
        : sessionStorage.getItem(`${PREFIX}${path}`);
    if (raw == null) return null;
    const y = Number.parseInt(raw, 10);
    return Number.isFinite(y) && y > 0 ? y : null;
  } catch {
    return null;
  }
}

export function restoreScrollPosition(path: string): void {
  if (typeof window === "undefined" || !path) return;
  const y = readStoredPosition(path);
  if (y == null) return;
  requestAnimationFrame(() => {
    window.scrollTo({ top: y, left: 0, behavior: "instant" });
    recordScrollPosition(path, y);
  });
}

/**
 * Synchronous variant for use inside useLayoutEffect — applies the scroll
 * position before the browser's next paint, no rAF hop, no flash.
 */
export function restoreScrollPositionSync(path: string): void {
  if (typeof window === "undefined" || !path) return;
  const y = readStoredPosition(path);
  if (y == null) return;
  window.scrollTo({ top: y, left: 0, behavior: "instant" });
  recordScrollPosition(path, y);
}

export function clearScrollPosition(path: string): void {
  livePositions.delete(path);
  try {
    sessionStorage.removeItem(`${PREFIX}${path}`);
  } catch {
    /* noop */
  }
}
