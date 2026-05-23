export function logNewsroomAnalytics(payload: Record<string, unknown>): void {
  console.log("[NEWSROOM_ANALYTICS]", JSON.stringify({
    ts: new Date().toISOString(),
    ...payload,
  }));
}
