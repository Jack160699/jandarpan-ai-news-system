"use client";

import {
  Activity,
  KeyRound,
  Mail,
  MoreHorizontal,
  Search,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TeamAvatar } from "@/components/admin-team/TeamAvatar";
import { AdminConfirmDialog } from "@/components/admin-newsroom/ui/AdminConfirmDialog";
import { AdminModal } from "@/components/admin-newsroom/ui/AdminModal";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { StatusBadge } from "@/components/admin-newsroom/ui/StatusBadge";
import { isPostgrestSchemaError } from "@/lib/newsroom-auth/schema-errors";
import { CANONICAL_ROLES } from "@/lib/saas-auth/roles";
import type { CanonicalRole } from "@/lib/saas-auth/roles";
import type { MembershipStatus } from "@/lib/saas-auth/types";
import {
  formatMemberDisplayName,
  type TeamActivity,
  type TeamMember,
} from "@/lib/types/team";

const PAGE_SIZE = 10;

const ROLE_LABELS: Record<CanonicalRole, string> = {
  super_admin: "Super admin",
  editor: "Editor",
  moderator: "Moderator",
  journalist: "Journalist",
};

const ACTION_LABELS: Record<string, string> = {
  team_create: "Staff created",
  team_invite: "Invitation sent",
  team_role_change: "Role updated",
  team_suspend: "Access suspended",
  team_reactivate: "Access restored",
  team_remove: "Removed from newsroom",
  team_password_reset: "Password reset",
};

function statusTone(
  status: MembershipStatus
): "approved" | "pending" | "rejected" | "neutral" {
  if (status === "active") return "approved";
  if (status === "invited") return "pending";
  if (status === "suspended") return "rejected";
  return "neutral";
}

function formatDate(iso: string | null, withTime = false): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

type ConfirmState = {
  type: "suspend" | "reactivate" | "remove";
  member: TeamMember;
} | null;

type ModalMode = "create" | "invite" | null;

export function TeamManagementPanel() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [activity, setActivity] = useState<TeamActivity[]>([]);
  const [tenantName, setTenantName] = useState("Jan Darpan");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schemaMismatch, setSchemaMismatch] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<"members" | "activity">("members");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<CanonicalRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<MembershipStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [busy, setBusy] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<CanonicalRole>("editor");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/team", {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        const msg = String(json.error ?? "Failed to load team");
        setError(msg);
        setSchemaMismatch(isPostgrestSchemaError(msg));
        return;
      }
      setTeam((json.team as TeamMember[]) ?? []);
      setActivity((json.activity as TeamActivity[]) ?? []);
      if (json.tenant?.name) setTenantName(json.tenant.name);
      const recovering = Boolean(json.recovery);
      setRecoveryMode(recovering);
      if (recovering) {
        setError(
          String(json.error ?? "Team service is in recovery mode. Limited actions only.")
        );
        setSchemaMismatch(isPostgrestSchemaError(String(json.error ?? "")));
      } else {
        setError(null);
        setSchemaMismatch(false);
      }
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
        formatMemberDisplayName(m).toLowerCase().includes(q) ||
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

  useEffect(() => setPage(0), [search, roleFilter, statusFilter]);

  async function patchMember(
    membershipId: string,
    patch: { role?: CanonicalRole; status?: MembershipStatus; password?: string }
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
        const msg = String(json.error ?? "Update failed");
        setSchemaMismatch(isPostgrestSchemaError(msg));
        showToast(msg);
        return false;
      }
      await refresh();
      showToast("Saved");
      return true;
    } catch {
      showToast("Network error");
      return false;
    } finally {
      setBusy(false);
      setMenuId(null);
    }
  }

  async function submitMemberForm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: modalMode,
          fullName: formName,
          email: formEmail,
          password: modalMode === "create" ? formPassword : undefined,
          role: formRole,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        const msg = String(json.error ?? "Request failed");
        setSchemaMismatch(isPostgrestSchemaError(msg));
        showToast(msg);
        return;
      }
      setModalMode(null);
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      setFormRole("editor");
      await refresh();
      showToast(
        modalMode === "invite"
          ? `Invitation sent to ${formEmail}`
          : `${formEmail} is ready to sign in`
      );
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
          showToast(String(json.error ?? "Remove failed"));
          return;
        }
        if (selected?.id === confirm.member.id) setSelected(null);
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

  async function submitPasswordReset(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const ok = await patchMember(selected.id, { password: resetPassword });
    if (ok) {
      setResetOpen(false);
      setResetPassword("");
      showToast("Password updated");
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

  const memberActivity = useMemo(() => {
    if (!selected) return activity.slice(0, 12);
    return activity.filter((a) => a.resourceId === selected.id).slice(0, 8);
  }, [activity, selected]);

  if (loading && team.length === 0) {
    return (
      <div className="anr-team anr-team--premium">
        <div className="anr-skeleton anr-team__skeleton" />
      </div>
    );
  }

  if (error && team.length === 0 && !recoveryMode) {
    return (
      <EmptyState
        title="Team unavailable"
        hint={error}
        action={
          schemaMismatch ? (
            <button
              type="button"
              className="anr-btn anr-btn--primary"
              onClick={() => {
                setLoading(true);
                void refresh();
              }}
            >
              Retry after migration
            </button>
          ) : (
            <button
              type="button"
              className="anr-btn anr-btn--ghost"
              onClick={() => {
                setLoading(true);
                void refresh();
              }}
            >
              Retry
            </button>
          )
        }
      />
    );
  }

  return (
    <div className="anr-team anr-team--premium">
      {recoveryMode ? (
        <div className="anr-team__recovery" role="status">
          <p>
            <strong>Recovery mode.</strong> {error ?? "Team data is temporarily unavailable."}{" "}
            You can still use other admin sections.
          </p>
          <button
            type="button"
            className="anr-btn anr-btn--ghost"
            onClick={() => {
              setLoading(true);
              void refresh();
            }}
          >
            Retry
          </button>
        </div>
      ) : null}
      <header className="anr-team__hero">
        <div>
          <p className="anr-team__eyebrow">{tenantName} · Tenant workspace</p>
          <h2 className="anr-team__hero-title">People & permissions</h2>
          <p className="anr-meta">
            Manage newsroom staff, roles, and Jan Darpan tenant memberships.
          </p>
        </div>
        <div className="anr-team__hero-actions">
          <button
            type="button"
            className="anr-btn anr-btn--ghost"
            onClick={() => {
              setModalMode("invite");
              setFormPassword("");
            }}
          >
            <Mail size={14} />
            Invite
          </button>
          <button
            type="button"
            className="anr-btn anr-btn--primary"
            onClick={() => setModalMode("create")}
          >
            <UserPlus size={14} />
            Create user
          </button>
        </div>
      </header>

      <div className="anr-team__stats">
        <article className="anr-team-stat">
          <Users size={16} />
          <div>
            <span>Total</span>
            <strong>{stats.total}</strong>
          </div>
        </article>
        <article className="anr-team-stat anr-team-stat--ok">
          <Shield size={16} />
          <div>
            <span>Active</span>
            <strong>{stats.active}</strong>
          </div>
        </article>
        <article className="anr-team-stat anr-team-stat--pending">
          <Mail size={16} />
          <div>
            <span>Invited</span>
            <strong>{stats.invited}</strong>
          </div>
        </article>
      </div>

      <div className="anr-team__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "members"}
          className={tab === "members" ? "is-active" : ""}
          onClick={() => setTab("members")}
        >
          Members
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "activity"}
          className={tab === "activity" ? "is-active" : ""}
          onClick={() => setTab("activity")}
        >
          <Activity size={14} />
          Activity
        </button>
      </div>

      {tab === "activity" ? (
        <AdminCard title="Team activity" className="anr-team__card">
          {activity.length === 0 ? (
            <p className="anr-meta anr-team__activity-empty">
              No team events yet. Changes appear here automatically.
            </p>
          ) : (
            <ul className="anr-team-activity">
              {activity.map((item) => (
                <li key={item.id}>
                  <span className="anr-team-activity__dot" />
                  <div>
                    <strong>
                      {ACTION_LABELS[item.action] ?? item.action}
                    </strong>
                    <span className="anr-meta">
                      {item.userEmail ?? "system"} ·{" "}
                      {formatDate(item.createdAt, true)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      ) : (
        <div className="anr-team__layout">
          <AdminCard className="anr-team__card anr-team__table-card">
            <div className="anr-team__filters">
              <div className="anr-team__search">
                <Search size={14} aria-hidden />
                <input
                  className="anr-input"
                  placeholder="Search people…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="anr-input anr-team__pill"
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value as CanonicalRole | "all")
                }
              >
                <option value="all">All roles</option>
                {CANONICAL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <select
                className="anr-input anr-team__pill"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as MembershipStatus | "all")
                }
              >
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="invited">Invited</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="anr-team__empty">
                <Users size={36} strokeWidth={1.2} />
                <p>No people match your filters</p>
                <button
                  type="button"
                  className="anr-btn anr-btn--primary"
                  onClick={() => setModalMode("create")}
                >
                  Add staff
                </button>
              </div>
            ) : (
              <>
                <div className="anr-team-table">
                  <div className="anr-team-table__head">
                    <span>Member</span>
                    <span>Role</span>
                    <span>Status</span>
                    <span>Joined</span>
                    <span>Last login</span>
                    <span />
                  </div>
                  {pageItems.map((member) => (
                    <div
                      key={member.id}
                      className={`anr-team-table__row ${selected?.id === member.id ? "is-selected" : ""}`}
                      onClick={() => setSelected(member)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setSelected(member);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="anr-team-table__member">
                        <TeamAvatar
                          name={formatMemberDisplayName(member)}
                          email={member.email}
                          hue={member.avatarHue}
                          size="md"
                        />
                        <div>
                          <strong>{formatMemberDisplayName(member)}</strong>
                          <span>{member.email}</span>
                        </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <select
                          className="anr-input anr-team__role-select"
                          value={member.role}
                          disabled={busy || member.status === "suspended"}
                          onChange={(e) =>
                            void patchMember(member.id, {
                              role: e.target.value as CanonicalRole,
                            })
                          }
                        >
                          {CANONICAL_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <StatusBadge
                          label={member.status}
                          tone={statusTone(member.status)}
                        />
                      </div>
                      <span className="anr-team-table__muted">
                        {formatDate(member.createdAt)}
                      </span>
                      <span className="anr-team-table__muted">
                        {formatDate(member.lastLoginAt, true)}
                      </span>
                      <div
                        className="anr-team__menu-wrap"
                        onClick={(e) => e.stopPropagation()}
                        ref={menuId === member.id ? menuRef : undefined}
                      >
                        <button
                          type="button"
                          className="anr-btn anr-btn--ghost anr-team__menu-btn"
                          aria-label="Actions"
                          onClick={() =>
                            setMenuId((id) =>
                              id === member.id ? null : member.id
                            )
                          }
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {menuId === member.id ? (
                          <div className="anr-team__menu">
                            <button
                              type="button"
                              onClick={() => {
                                setSelected(member);
                                setResetOpen(true);
                                setMenuId(null);
                              }}
                            >
                              <KeyRound size={14} />
                              Reset password
                            </button>
                            {member.status === "suspended" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirm({ type: "reactivate", member })
                                }
                              >
                                Reactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirm({ type: "suspend", member })
                                }
                              >
                                Suspend
                              </button>
                            )}
                            <button
                              type="button"
                              className="anr-team__menu-danger"
                              onClick={() =>
                                setConfirm({ type: "remove", member })
                              }
                            >
                              Remove
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="anr-team__pagination">
                  <span className="anr-meta">
                    {safePage * PAGE_SIZE + 1}–
                    {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of{" "}
                    {filtered.length}
                  </span>
                  <div>
                    <button
                      type="button"
                      className="anr-btn anr-btn--ghost"
                      disabled={safePage <= 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      className="anr-btn anr-btn--ghost"
                      disabled={safePage >= pageCount - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </AdminCard>

          <aside className="anr-team-drawer">
            {selected ? (
              <>
                <div className="anr-team-drawer__profile">
                  <TeamAvatar
                    name={formatMemberDisplayName(selected)}
                    email={selected.email}
                    hue={selected.avatarHue}
                    size="lg"
                  />
                  <div>
                    <h3>{formatMemberDisplayName(selected)}</h3>
                    <p className="anr-meta">{selected.email}</p>
                    <StatusBadge
                      label={ROLE_LABELS[selected.role]}
                      tone="neutral"
                    />
                  </div>
                </div>
                <section className="anr-team-drawer__section">
                  <h4>Permissions</h4>
                  <ul className="anr-team-perms">
                    {selected.permissions.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </section>
                <section className="anr-team-drawer__section">
                  <h4>Membership</h4>
                  <dl className="anr-team-meta">
                    <div>
                      <dt>Status</dt>
                      <dd>{selected.status}</dd>
                    </div>
                    <div>
                      <dt>Joined</dt>
                      <dd>{formatDate(selected.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Last login</dt>
                      <dd>{formatDate(selected.lastLoginAt, true)}</dd>
                    </div>
                    <div>
                      <dt>Tenant</dt>
                      <dd>{tenantName}</dd>
                    </div>
                  </dl>
                </section>
                <section className="anr-team-drawer__section">
                  <h4>Recent activity</h4>
                  {memberActivity.length === 0 ? (
                    <p className="anr-meta">No events for this member</p>
                  ) : (
                    <ul className="anr-team-activity anr-team-activity--compact">
                      {memberActivity.map((item) => (
                        <li key={item.id}>
                          <span className="anr-team-activity__dot" />
                          <div>
                            <strong>
                              {ACTION_LABELS[item.action] ?? item.action}
                            </strong>
                            <span className="anr-meta">
                              {formatDate(item.createdAt, true)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <div className="anr-team-drawer__actions">
                  <button
                    type="button"
                    className="anr-btn anr-btn--ghost"
                    onClick={() => setResetOpen(true)}
                  >
                    <KeyRound size={14} />
                    Reset password
                  </button>
                </div>
              </>
            ) : (
              <div className="anr-team-drawer__placeholder">
                <Users size={28} strokeWidth={1.2} />
                <p>Select a team member to view permissions and activity</p>
              </div>
            )}
          </aside>
        </div>
      )}

      <AdminModal
        open={modalMode !== null}
        title={modalMode === "invite" ? "Invite to newsroom" : "Create staff account"}
        subtitle={
          modalMode === "invite"
            ? "Sends Supabase invite email · Jan Darpan tenant membership"
            : "Creates auth user with password · active membership"
        }
        onClose={() => !busy && setModalMode(null)}
        wide
        footer={
          <div className="anr-modal__actions">
            <button
              type="button"
              className="anr-btn anr-btn--ghost"
              onClick={() => setModalMode(null)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="anr-team-member-form"
              className="anr-btn anr-btn--primary"
              disabled={busy}
            >
              {busy ? "Saving…" : modalMode === "invite" ? "Send invite" : "Create user"}
            </button>
          </div>
        }
      >
        <form
          id="anr-team-member-form"
          className="anr-team__form"
          onSubmit={submitMemberForm}
        >
          <label className="anr-team__field">
            <span>Full name</span>
            <input
              className="anr-input"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
          </label>
          <label className="anr-team__field">
            <span>Email</span>
            <input
              className="anr-input"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              required
            />
          </label>
          {modalMode === "create" ? (
            <label className="anr-team__field">
              <span>Password</span>
              <input
                className="anr-input"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
          ) : null}
          <label className="anr-team__field">
            <span>Role</span>
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
          </label>
        </form>
      </AdminModal>

      <AdminModal
        open={resetOpen && selected !== null}
        title="Reset password"
        subtitle={selected?.email}
        onClose={() => !busy && setResetOpen(false)}
        footer={
          <div className="anr-modal__actions">
            <button
              type="button"
              className="anr-btn anr-btn--ghost"
              onClick={() => setResetOpen(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="anr-reset-password-form"
              className="anr-btn anr-btn--primary"
              disabled={busy}
            >
              {busy ? "Updating…" : "Update password"}
            </button>
          </div>
        }
      >
        <form id="anr-reset-password-form" onSubmit={submitPasswordReset}>
          <label className="anr-team__field">
            <span>New password</span>
            <input
              className="anr-input"
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
          </label>
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
              ? `${formatMemberDisplayName(confirm.member)} loses tenant access. Auth account is kept.`
              : confirm.type === "suspend"
                ? `${formatMemberDisplayName(confirm.member)} cannot sign in until reactivated.`
                : `${formatMemberDisplayName(confirm.member)} will regain active access.`
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

      {toast ? (
        <div className="anr-toast anr-toast--success" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
