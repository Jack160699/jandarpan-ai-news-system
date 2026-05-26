/**
 * Realtime channel naming — tenant-scoped to reduce cross-tenant subscription risk.
 * Persistence remains API-guarded; channels are not secret authentication.
 */

export function buildCollabChannelName(input: {
  tenantId: string;
  roomType: "article" | "tenant";
  roomId: string;
}): string {
  const safeTenant = input.tenantId.replace(/[^a-zA-Z0-9-]/g, "");
  const safeRoom = input.roomId.replace(/[^a-zA-Z0-9-]/g, "");
  return `collab:${safeTenant}:${input.roomType}:${safeRoom}`;
}

export function validateCollabChannelAccess(
  channelName: string,
  tenantId: string
): boolean {
  return channelName.startsWith(`collab:${tenantId.replace(/[^a-zA-Z0-9-]/g, "")}:`);
}
