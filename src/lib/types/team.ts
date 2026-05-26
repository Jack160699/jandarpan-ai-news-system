/**
 * Central team / membership types for admin newsroom management.
 */

import type { CanonicalRole } from "@/lib/saas-auth/roles";
import type { MembershipStatus } from "@/lib/saas-auth/types";

export type TeamRole = CanonicalRole;

export type TeamStatus = MembershipStatus;

export type PermissionSet = Record<string, boolean | string | number>;

export type TeamMember = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  fullName?: string | null;
  role: TeamRole;
  status: TeamStatus;
  avatarUrl?: string | null;
  createdAt: string;
  joinedAt?: string | null;
  lastLoginAt: string | null;
  avatarHue: number;
  permissions: string[];
};

export type TeamActivity = {
  id: string;
  action: string;
  userEmail: string | null;
  resourceId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type InvitePayload = {
  mode: "invite";
  email: string;
  fullName: string;
  role: TeamRole;
};

export type CreateStaffPayload = {
  mode: "create";
  email: string;
  fullName: string;
  password: string;
  role: TeamRole;
};

export type TeamMemberPatch = {
  membershipId: string;
  role?: TeamRole;
  status?: TeamStatus;
  password?: string;
};

/** DB row shape (snake_case) for mapping helpers */
export type TenantMembershipDbRow = {
  id: string;
  tenant_id?: string;
  user_id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role: string;
  status: string;
  permissions?: PermissionSet | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  joined_at?: string | null;
  last_login_at?: string | null;
  updated_at?: string | null;
};

export function formatMemberDisplayName(
  member: Pick<
    TeamMember,
    "displayName" | "fullName" | "email"
  > & { display_name?: string | null; full_name?: string | null }
): string {
  const fromSnake =
    member.display_name?.trim() ||
    member.full_name?.trim() ||
    null;
  const fromCamel =
    member.displayName?.trim() ||
    member.fullName?.trim() ||
    null;
  const name = fromSnake || fromCamel;
  if (name) return name;
  const email = member.email?.trim();
  if (email) {
    const local = email.split("@")[0];
    if (local) return local;
    return email;
  }
  return "Unnamed user";
}
