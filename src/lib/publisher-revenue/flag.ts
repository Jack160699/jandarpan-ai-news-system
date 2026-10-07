/** Revenue sharing is architecture only until the founder switches it on. Default: OFF. Only the exact string "true" enables it. */
export function publisherRevenueEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.PUBLISHER_REVENUE_SHARE_ENABLED === "true";
}

export const REVENUE_NOT_ACTIVE_MESSAGE = "Revenue sharing is not active yet. Your stories are being tracked, but no earnings accrue until it launches.";
