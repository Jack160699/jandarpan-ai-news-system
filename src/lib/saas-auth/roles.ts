/**
 * Canonical newsroom RBAC roles (DB + app)
 */

export const CANONICAL_ROLES = [
  "super_admin",
  "editor",
  "moderator",
  "journalist",
] as const;

export type CanonicalRole = (typeof CANONICAL_ROLES)[number];

/** Legacy DB/app roles → canonical */
const LEGACY_ROLE_MAP: Record<string, CanonicalRole> = {
  owner: "super_admin",
  super_admin: "super_admin",
  admin: "super_admin",
  publisher: "moderator",
  moderator: "moderator",
  editor: "editor",
  viewer: "journalist",
  billing: "journalist",
  journalist: "journalist",
};

export function normalizeDashboardRole(role: string): CanonicalRole {
  const key = role?.trim().toLowerCase();
  if (key in LEGACY_ROLE_MAP) return LEGACY_ROLE_MAP[key];
  if (CANONICAL_ROLES.includes(key as CanonicalRole)) {
    return key as CanonicalRole;
  }
  return "journalist";
}

export const SUPER_ADMIN_EMAILS = new Set(
  (
    process.env.NEWSROOM_SUPER_ADMIN_EMAILS ??
    "shriyanshchandrakar@gmail.com"
  )
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export function resolveRoleForEmail(
  email: string,
  existingRole?: string | null
): CanonicalRole {
  const normalized = email.trim().toLowerCase();
  if (SUPER_ADMIN_EMAILS.has(normalized)) return "super_admin";
  if (existingRole) return normalizeDashboardRole(existingRole);
  return "journalist";
}
