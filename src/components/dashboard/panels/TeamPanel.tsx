"use client";

import { useState } from "react";
import { useEditorialDesk } from "@/providers/EditorialDeskContext";
import type { DashboardRole } from "@/lib/saas-auth/types";

const ROLES: DashboardRole[] = ["viewer", "editor", "admin", "billing", "owner"];

export function TeamPanel() {
  const { data, refresh } = useEditorialDesk();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<DashboardRole>("editor");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/dashboard/team", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const json = await res.json();
      if (!json.ok) {
        setMessage(json.error ?? "Invite failed");
      } else {
        setMessage("Invitation recorded");
        setEmail("");
        await refresh();
      }
    } catch {
      setMessage("Network error");
    } finally {
      setBusy(false);
    }
  }

  const team = data?.team ?? [];

  return (
    <div className="anr-stack">
      <div className="anr-card">
        <h2 className="anr-card__title">Invite teammate</h2>
        {message ? <p className="anr-meta">{message}</p> : null}
        <form onSubmit={invite} className="anr-toolbar">
          <input
            className="anr-input"
            type="email"
            placeholder="colleague@newsroom.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <select
            className="anr-input"
            value={role}
            onChange={(e) => setRole(e.target.value as DashboardRole)}
          >
            {ROLES.filter((r) => r !== "owner").map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="anr-btn anr-btn--primary"
            disabled={busy}
          >
            Invite
          </button>
        </form>
        <p className="anr-meta">
          Invites create a pending membership. Link the user_id after they sign
          up via Supabase Auth.
        </p>
      </div>

      <div className="anr-card">
        <h2 className="anr-card__title">Team ({team.length})</h2>
        <div className="anr-table-wrap">
          <table className="anr-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.id}>
                  <td>{m.email}</td>
                  <td>{m.role}</td>
                  <td>{m.status}</td>
                  <td>{new Date(m.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
