export function logShortsAnalytics(payload: Record<string, unknown>): void {
  console.log("[SHORTS_ANALYTICS]", JSON.stringify({
    ts: new Date().toISOString(),
    ...payload,
  }));
}
