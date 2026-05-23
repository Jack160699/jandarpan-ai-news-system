export function logWhitelabelAnalytics(payload: Record<string, unknown>): void {
  console.log("[WHITELABEL_ANALYTICS]", JSON.stringify({
    ts: new Date().toISOString(),
    ...payload,
  }));
}
