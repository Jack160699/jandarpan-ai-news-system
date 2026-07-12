/** Enable Notification Center V3 (default OFF — set NEXT_PUBLIC_NOTIFICATION_CENTER_V3=1) */
export function isNotificationCenterV3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_NOTIFICATION_CENTER_V3 === "1";
}
