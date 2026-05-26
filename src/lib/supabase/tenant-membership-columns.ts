/**
 * Explicit PostgREST column lists for tenant_memberships — never use select("*").
 */

/** Full row for team directory / detail panels */
export const TENANT_MEMBERSHIP_TEAM_SELECT = `
  id,
  tenant_id,
  user_id,
  email,
  role,
  status,
  display_name,
  avatar_url,
  permissions,
  metadata,
  invited_by,
  last_login_at,
  joined_at,
  created_at,
  updated_at
`.replace(/\s+/g, " ");

/** Lighter list for team management table */
export const TENANT_MEMBERSHIP_LIST_SELECT = `
  id,
  user_id,
  email,
  display_name,
  avatar_url,
  role,
  status,
  metadata,
  created_at,
  last_login_at,
  joined_at,
  updated_at
`.replace(/\s+/g, " ");

/** Legacy fallback when display_name / metadata not yet in schema cache */
export const TENANT_MEMBERSHIP_LIST_SELECT_LEGACY = `
  id,
  user_id,
  email,
  role,
  status,
  created_at,
  last_login_at,
  updated_at
`.replace(/\s+/g, " ");

/** Session / auth bootstrap */
export const TENANT_MEMBERSHIP_SESSION_SELECT = `
  id,
  tenant_id,
  user_id,
  email,
  role,
  status,
  display_name,
  metadata
`.replace(/\s+/g, " ");
