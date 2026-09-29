"use client";

import { useCallback, useEffect, useState } from "react";
import { Av3EmptyState, Av3Panel, Av3StatusBadge } from "@/components/admin-v3";
import type { AdminUserPage } from "@/lib/admin-ops/users";

type Sort = "email" | "created_at" | "last_sign_in_at";

const day = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16).replace("T", " ") + "Z" : "never");

/**
 * Secure admin user table. Data comes from /api/admin/ops/users (server-side, service-role-only
 * SQL function); nothing in this component ever touches auth.users or a Supabase key.
 */
export function UsersPanel({ total }: { total: number }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("created_at");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminUserPage | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error" | "forbidden">("loading");
  const pageSize = 15;

  const load = useCallback(async () => {
    setState("loading");
    try {
      const qs = new URLSearchParams({ search: query, sort, dir, page: String(page), pageSize: String(pageSize) });
      const res = await fetch(`/api/admin/ops/users?${qs}`, { cache: "no-store" });
      if (res.status === 401 || res.status === 403) return setState("forbidden");
      const json = (await res.json()) as AdminUserPage & { ok: boolean };
      if (!json.ok) return setState("error");
      setData(json);
      setState("idle");
    } catch {
      setState("error");
    }
  }, [query, sort, dir, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (col: Sort) => {
    if (sort === col) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(col);
      setDir(col === "email" ? "asc" : "desc");
    }
    setPage(1);
  };
  const arrow = (col: Sort) => (sort === col ? (dir === "asc" ? " ▲" : " ▼") : "");
  const pages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <Av3Panel title="Users" subtitle={`${total} registered accounts. Emails are loaded server-side for admins only.`}>
      <div className="ops-users__bar">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(search);
          }}
        >
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email…" aria-label="Search users by email" />{" "}
          <button className="ops-btn" type="submit">Search</button>
        </form>
        <span className="ops-kpi__hint">{data ? `${data.total} match${data.total === 1 ? "" : "es"} · page ${page} of ${pages}` : ""}</span>
      </div>
      {state === "forbidden" ? (
        <Av3EmptyState title="Not permitted" message="Your role cannot view the user list." />
      ) : state === "error" ? (
        <Av3EmptyState title="User list unavailable" message="The server could not load users (migration 086 applied?)." />
      ) : (
        <div className="ops-table-scroll">
          <table className="av3-table">
            <thead>
              <tr>
                <th><button className="ops-sort" onClick={() => toggle("email")}>Email{arrow("email")}</button></th>
                <th><button className="ops-sort" onClick={() => toggle("created_at")}>Registered{arrow("created_at")}</button></th>
                <th><button className="ops-sort" onClick={() => toggle("last_sign_in_at")}>Last sign-in{arrow("last_sign_in_at")}</button></th>
                <th>Status</th>
                <th>Provider</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).map((u) => (
                <tr key={u.id}>
                  <td>{u.email ?? "—"}</td>
                  <td>{day(u.created_at)}</td>
                  <td>{day(u.last_sign_in_at)}</td>
                  <td><Av3StatusBadge label={u.status} tone={u.status === "active" ? "healthy" : u.status === "unconfirmed" ? "warning" : "critical"} /></td>
                  <td>{u.providers ?? "—"}</td>
                </tr>
              ))}
              {data && data.rows.length === 0 ? (
                <tr><td colSpan={5}>No users match.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
      <div className="ops-chips" style={{ marginTop: "0.6rem" }}>
        <button className="ops-btn" disabled={page <= 1 || state === "loading"} onClick={() => setPage((p) => p - 1)}>← Prev</button>
        <button className="ops-btn" disabled={page >= pages || state === "loading"} onClick={() => setPage((p) => p + 1)}>Next →</button>
      </div>
    </Av3Panel>
  );
}
