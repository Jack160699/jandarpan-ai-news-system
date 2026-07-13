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

export function resolveCurrentScrollPosition(path: string): number {
  const recorded = getRecordedScrollPosition(path);
  if (recorded != null) return recorded;
  if (typeof window === "undefined") return 0;
  try {
    const parsed = Number.parseInt(
      sessionStorage.getItem(`${PREFIX}${path}`) ?? "",
      10
    );
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  } catch {
    /* ignore */
  }
  return Math.max(0, Math.round(window.scrollY));
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

  let attempts = 0;
  const maxAttempts = 12;

  const apply = () => {
    const maxScroll = Math.max(
      0,
      (document.documentElement?.scrollHeight ?? 0) - window.innerHeight
    );
    const top = Math.min(y, maxScroll);
    window.scrollTo(0, top);
    recordScrollPosition(path, top);

    attempts += 1;
    if (top + 8 < y && attempts < maxAttempts) {
      window.setTimeout(apply, 120);
    }
  };

  apply();
  requestAnimationFrame(apply);
  window.setTimeout(apply, 50);
  window.setTimeout(apply, 250);
  window.setTimeout(apply, 600);
}

/**
 * Synchronous variant for use inside useLayoutEffect — applies the scroll
 * position before the browser's next paint, no rAF hop, no flash.
 */
export function restoreScrollPositionSync(path: string): void {
  if (typeof window === "undefined" || !path) return;
  const y = readStoredPosition(path);
  if (y == null) return;
  window.scrollTo(0, y);
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
