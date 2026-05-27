/**
 * Resilient tenant_memberships writes — retries without optional columns when schema cache lags.
 */

import type { PostgrestError } from "@supabase/supabase-js";
import { createAdminServerClient } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase/safe-query";
import {
  TENANT_MEMBERSHIP_LIST_SELECT,
  TENANT_MEMBERSHIP_LIST_SELECT_LEGACY,
} from "@/lib/supabase/tenant-membership-columns";
import { isPostgrestSchemaError } from "@/lib/newsroom-auth/schema-errors";
import type { TenantMembershipDbRow } from "@/lib/types/team";
import { asJsonObject } from "@/types/json";

type UpsertInput = {
  tenantId: string;
  userId: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  invitedBy: string;
  lastLoginAt?: string | null;
};

function pickLegacyMetadata(displayName: string): Record<string, unknown> {
  return { full_name: displayName };
}

export async function upsertTenantMembership(
  input: UpsertInput
): Promise<{ data: TenantMembershipDbRow | null; error: PostgrestError | null }> {
  const supabase = createAdminServerClient();
  const now = new Date().toISOString();

  const fullRow = {
    tenant_id: input.tenantId,
    user_id: input.userId,
    email: input.email,
    display_name: input.displayName,
    role: input.role,
    status: input.status,
    invited_by: input.invitedBy,
    metadata: asJsonObject(pickLegacyMetadata(input.displayName)),
    last_login_at: input.lastLoginAt ?? null,
    updated_at: now,
  };

  let result = await supabase
    .from("tenant_memberships")
    .upsert(fullRow, { onConflict: "tenant_id,user_id" })
    .select(TENANT_MEMBERSHIP_LIST_SELECT)
    .single();

  if (
    result.error &&
    isPostgrestSchemaError(result.error.message)
  ) {
    const { display_name: _dn, metadata: _md, ...legacyRow } = fullRow;
    result = await supabase
      .from("tenant_memberships")
      .upsert(legacyRow, { onConflict: "tenant_id,user_id" })
      .select(TENANT_MEMBERSHIP_LIST_SELECT_LEGACY)
      .single();
  }

  return {
    data: (result.data ?? null) as unknown as TenantMembershipDbRow | null,
    error: result.error,
  };
}

export async function queryTenantMembershipList(
  tenantId: string
): Promise<{ data: TenantMembershipDbRow[]; error: PostgrestError | null }> {
  const supabase = createAdminServerClient();

  const result = await safeQuery<TenantMembershipDbRow[]>(
    async () => {
      const r = await supabase
        .from("tenant_memberships")
        .select(TENANT_MEMBERSHIP_LIST_SELECT)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      return {
        data: (r.data ?? []) as unknown as TenantMembershipDbRow[],
        error: r.error,
      };
    },
    {
      label: "tenant_memberships.list",
      onSchemaMismatch: async () => {
        const legacy = await supabase
          .from("tenant_memberships")
          .select(TENANT_MEMBERSHIP_LIST_SELECT_LEGACY)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false });
        return {
          data: (legacy.data ?? []) as unknown as TenantMembershipDbRow[],
          error: legacy.error,
        };
      },
    }
  );

  if (!result.ok) {
    return {
      data: [],
      error: {
        message: result.error.message,
        code: result.error.code,
        details: "",
        hint: "",
        name: "PostgrestError",
      } as PostgrestError,
    };
  }

  return { data: result.data ?? [], error: null };
}
