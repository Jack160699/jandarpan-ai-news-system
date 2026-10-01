/**
 * Admin user listing. auth.users is only ever read here, server-side, through a
 * SECURITY DEFINER function that is executable by service_role alone — never through a
 * public client and never with the service key in browser code.
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";

export type AdminUserRow = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  status: "active" | "banned" | "deleted" | "unconfirmed";
  providers: string | null;
};

export type AdminUserPage = {
  total: number;
  rows: AdminUserRow[];
  limit: number;
  offset: number;
};

export type AdminUserQuery = {
  search?: string;
  sort?: "email" | "created_at" | "last_sign_in_at";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export function normalizeUserQuery(q: AdminUserQuery) {
  const pageSize = Math.min(Math.max(Math.floor(q.pageSize ?? 25), 1), 100);
  const page = Math.max(Math.floor(q.page ?? 1), 1);
  const sort = q.sort === "email" || q.sort === "last_sign_in_at" ? q.sort : "created_at";
  const dir = q.dir === "asc" ? "asc" : "desc";
  // Strip LIKE wildcards / control characters from the free-text filter.
  const search = (q.search ?? "").replace(/[%_\\\u0000-\u001f]/g, "").trim().slice(0, 100) || null;
  return { pageSize, page, sort, dir, search, offset: (page - 1) * pageSize };
}

export async function listAdminUsers(query: AdminUserQuery): Promise<AdminUserPage> {
  if (!isSupabaseConfigured()) throw new Error("supabase_not_configured");
  const n = normalizeUserQuery(query);
  const supabase = createAdminServerClient();
  const { data, error } = await supabase.rpc("admin_list_users" as never, {
    p_search: n.search,
    p_sort: n.sort,
    p_dir: n.dir,
    p_limit: n.pageSize,
    p_offset: n.offset,
  } as never);
  if (error) throw new Error(`admin_list_users: ${error.message}`);
  return data as unknown as AdminUserPage;
}
