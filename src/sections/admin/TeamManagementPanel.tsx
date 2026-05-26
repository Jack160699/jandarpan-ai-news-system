"use client";

import {
  ChevronDown,
  MoreHorizontal,
  Plus,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminConfirmDialog } from "@/components/admin-newsroom/ui/AdminConfirmDialog";
import { AdminModal } from "@/components/admin-newsroom/ui/AdminModal";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { StatusBadge } from "@/components/admin-newsroom/ui/StatusBadge";
import { CANONICAL_ROLES } from "@/lib/saas-auth/roles";
import type { CanonicalRole } from "@/lib/saas-auth/roles";
import type { MembershipStatus } from "@/lib/saas-auth/types";

type TeamMember = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: CanonicalRole;
  status: MembershipStatus;
  createdAt: string;
  lastLoginAt: string | null;
};

const PAGE_SIZE = 8;

const ROLE_LABELS: Record<CanonicalRole, string> = {
  super_admin: "Super admin",
  editor: "Editor",
  moderator: "Moderator",
  journalist: "Journalist",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? "JD").toUpperCase();
}

function statusTone(
  status: MembershipStatus
): "approved" | "pending" | "rejected" | "neutral" {
  if (status === "active") return "approved";
  if (status === "invited") return "pending";
  if (status === "suspended") return "rejected";
  return "neutral";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type ConfirmState = {
  type: "suspend" | "reactivate" | "remove";
  member: TeamMember;
} | null;

export function TeamManagementPanel() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<CanonicalRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<MembershipStatus | "all">(
    "all"
  );
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [busy, setBusy] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<CanonicalRole>("editor");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/team", {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to load team");
        return;
      }
      setTeam(json.team as TeamMember[]);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuId(null);
      }
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return team.filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (!q) return true;
      return (
        m.email.includes(q) ||
        m.displayName.toLowerCase().includes(q) ||
        m.role.includes(q)
      );
    });
  }, [team, search, roleFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  useEffect(() => {
    setPage(0);
  }, [search, roleFilter, statusFilter]);

  async function patchMember(
    membershipId: string,
    patch: { role?: CanonicalRole; status?: MembershipStatus }
  ) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/team", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId, ...patch }),
      });
      const json = await res.json();
      if (!json.ok) {
        showToast(json.error ?? "Update failed");
        return false;
      }
      await refresh();
      showToast("Team updated");
      return true;
    } catch {
      showToast("Network error");
      return false;
    } finally {
      setBusy(false);
      setMenuId(null);
    }
  }

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        showToast(json.error ?? "Could not create user");
        return;
      }
      setCreateOpen(false);
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      setFormRole("editor");
      await refresh();
      showToast(`${formEmail} added to newsroom`);
    } catch {
      showToast("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.type === "remove") {
        const res = await fetch("/api/admin/team", {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ membershipId: confirm.member.id }),
        });
        const json = await res.json();
        if (!json.ok) {
          showToast(json.error ?? "Remove failed");
          return;
        }
        showToast("Removed from newsroom");
      } else {
        const status: MembershipStatus =
          confirm.type === "suspend" ? "suspended" : "active";
        const ok = await patchMember(confirm.member.id, { status });
        if (!ok) return;
      }
      setConfirm(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const stats = useMemo(
    () => ({
      total: team.length,
      active: team.filter((m) => m.status === "active").length,
      invited: team.filter((m) => m.status === "invited").length,
    }),
    [team]
  );

  if (loading && team.length === 0) {
    return (
      <div className="anr-team">
        <div className="anr-skeleton" style={{ height: "14rem" }} />
      </div>
    );
  }

  if (error && team.length === 0) {
    return (
      <EmptyState
        title="Team unavailable"
        hint={error}
      />
    );
  }

  return (
    <div className="anr-team">
      <div className="anr-kpis anr-team__kpis">
        <article className="anr-kpi">
          <span>Total staff</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="anr-kpi">
          <span>Active</span>
          <strong className="anr-kpi--ok">{stats.active}</strong>
        </article>
        <article className="anr-kpi">
          <span>Pending invites</span>
          <strong>{stats.invited}</strong>
        </article>
      </div>

      <AdminCard
        title="Newsroom team"
        className="anr-team__card"
        action={
          <button
            type="button"
            className="anr-btn anr-btn--primary"
            onClick={() => setCreateOpen(true)}
          >
            <UserPlus size={14} />
            Add staff
          </button>
        }
      >
        <div className="anr-team__filters">
          <div className="anr-team__search">
            <Search size={14} aria-hidden />
            <input
              className="anr-input"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search team"
            />
          </div>
          <select
            className="anr-input anr-team__select"
            value={roleFilter}
            onChange={(e) =>
              setRoleFilter(e.target.value as CanonicalRole | "all")
            }
            aria-label="Filter by role"
          >
            <option value="all">All roles</option>
            {CANONICAL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <select
            className="anr-input anr-team__select"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as MembershipStatus | "all")
            }
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="anr-team__empty">
            <Users size={32} strokeWidth={1.25} aria-hidden />
            <p>No team members match your filters</p>
            <button
              type="button"
              className="anr-btn anr-btn--primary"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={14} />
              Create first staff account
            </button>
          </div>
        ) : (
          <>
            <div className="anr-table-wrap anr-team__table-wrap">
              <table className="anr-table anr-team__table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Last login</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div className="anr-team__member">
                          <span className="anr-team__avatar" aria-hidden>
                            {initials(member.displayName)}
                          </span>
                          <div>
                            <strong>{member.displayName}</strong>
                            <span className="anr-meta">{member.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          className="anr-input anr-team__role-select"
                          value={member.role}
                          disabled={busy || member.status === "suspended"}
                          onChange={(e) =>
                            void patchMember(member.id, {
                              role: e.target.value as CanonicalRole,
                            })
                          }
                          aria-label={`Role for ${member.email}`}
                        >
                          {CANONICAL_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <StatusBadge
                          label={member.status}
                          tone={statusTone(member.status)}
                        />
                      </td>
                      <td className="anr-meta">{formatDate(member.createdAt)}</td>
                      <td className="anr-meta">
                        {formatDate(member.lastLoginAt)}
                      </td>
                      <td className="anr-team__actions-cell">
                        <div
                          className="anr-team__menu-wrap"
                          ref={menuId === member.id ? menuRef : undefined}
                        >
                          <button
                            type="button"
                            className="anr-btn anr-btn--ghost anr-team__menu-btn"
                            aria-label={`Actions for ${member.displayName}`}
                            aria-expanded={menuId === member.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuId((id) =>
                                id === member.id ? null : member.id
                              );
                            }}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {menuId === member.id ? (
                            <div className="anr-team__menu" role="menu">
                              {member.status === "suspended" ? (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() =>
                                    setConfirm({
                                      type: "reactivate",
                                      member,
                                    })
                                  }
                                >
                                  Reactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() =>
                                    setConfirm({ type: "suspend", member })
                                  }
                                >
                                  Suspend access
                                </button>
                              )}
                              <button
                                type="button"
                                role="menuitem"
                                className="anr-team__menu-danger"
                                onClick={() =>
                                  setConfirm({ type: "remove", member })
                                }
                              >
                                Remove from newsroom
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="anr-team__pagination">
              <span className="anr-meta">
                {filtered.length === 0
                  ? "0 members"
                  : `${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
              </span>
              <div className="anr-team__pagination-btns">
                <button
                  type="button"
                  className="anr-btn anr-btn--ghost"
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="anr-btn anr-btn--ghost"
                  disabled={safePage >= pageCount - 1}
                  onClick={() =>
                    setPage((p) => Math.min(pageCount - 1, p + 1))
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </AdminCard>

      <AdminModal
        open={createOpen}
        title="Create newsroom staff"
        subtitle="Creates Supabase Auth user + Jan Darpan tenant membership"
        onClose={() => !busy && setCreateOpen(false)}
        wide
        footer={
          <div className="anr-modal__actions">
            <button
              type="button"
              className="anr-btn anr-btn--ghost"
              onClick={() => setCreateOpen(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="anr-create-staff-form"
              className="anr-btn anr-btn--primary"
              disabled={busy}
            >
              {busy ? "Creating…" : "Create staff"}
            </button>
          </div>
        }
      >
        <form
          id="anr-create-staff-form"
          className="anr-team__form"
          onSubmit={createStaff}
        >
          <label className="anr-team__field">
            <span>Full name</span>
            <input
              className="anr-input"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              required
              autoComplete="name"
            />
          </label>
          <label className="anr-team__field">
            <span>Email</span>
            <input
              className="anr-input"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="staff@jandarpan.com"
              required
              autoComplete="email"
            />
          </label>
          <label className="anr-team__field">
            <span>Password</span>
            <input
              className="anr-input"
              type="password"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label className="anr-team__field">
            <span>Role</span>
            <div className="anr-team__role-picker">
              <select
                className="anr-input"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as CanonicalRole)}
              >
                {CANONICAL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="anr-team__chevron" aria-hidden />
            </div>
          </label>
          <p className="anr-meta anr-team__form-hint">
            Super admins have full access including this team page. Moderators can
            publish; editors write desk content; journalists are read-focused.
          </p>
        </form>
      </AdminModal>

      <AdminConfirmDialog
        open={confirm !== null}
        title={
          confirm?.type === "remove"
            ? "Remove from newsroom?"
            : confirm?.type === "suspend"
              ? "Suspend access?"
              : "Reactivate member?"
        }
        message={
          confirm
            ? confirm.type === "remove"
              ? `${confirm.member.displayName} will lose access to this tenant. Their Supabase account remains.`
              : confirm.type === "suspend"
                ? `${confirm.member.displayName} will not be able to sign in until reactivated.`
                : `${confirm.member.displayName} will regain active newsroom access.`
            : ""
        }
        confirmLabel={
          confirm?.type === "remove"
            ? "Remove"
            : confirm?.type === "suspend"
              ? "Suspend"
              : "Reactivate"
        }
        danger={confirm?.type === "remove" || confirm?.type === "suspend"}
        busy={busy}
        onCancel={() => !busy && setConfirm(null)}
        onConfirm={() => void runConfirm()}
      />

      {toast ? <div className="anr-toast" role="status">{toast}</div> : null}
    </div>
  );
}
