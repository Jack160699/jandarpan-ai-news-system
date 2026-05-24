type LiveFeedLogPayload = Record<string, unknown>;

export function logLiveFeed(
  stage: string,
  payload: LiveFeedLogPayload = {}
): void {
  console.log("[LIVE_FEED]", JSON.stringify({ stage, ts: new Date().toISOString(), ...payload }));
}

export function warnLiveFeed(
  stage: string,
  payload: LiveFeedLogPayload = {}
): void {
  console.warn("[LIVE_FEED]", JSON.stringify({ stage, level: "warn", ts: new Date().toISOString(), ...payload }));
}

export function errorLiveFeed(
  stage: string,
  payload: LiveFeedLogPayload = {}
): void {
  console.error("[LIVE_FEED]", JSON.stringify({ stage, level: "error", ts: new Date().toISOString(), ...payload }));
}
