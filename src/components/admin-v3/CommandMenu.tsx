"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  ADMIN_WORKSPACES,
  workspacesForRole,
} from "@/lib/admin-platform/workspaces";
import { canAccessAdminRoute, isSuperAdmin } from "@/lib/newsroom-auth/rbac";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";
import type { DashboardRole } from "@/lib/saas-auth/types";

type CommandItem = {
  id: string;
  label: string;
  href: string;
  group: string;
};

const ACTIONS: CommandItem[] = [
  { id: "a-stories", label: "Open story queue", href: "/admin/stories", group: "Actions" },
  { id: "a-editor", label: "Open editor", href: "/admin/editor", group: "Actions" },
  { id: "a-health", label: "Open platform health", href: "/admin/health", group: "Actions" },
  { id: "a-gsc", label: "Open SEO Hub", href: "/admin/seo/search-console", group: "Actions" },
  { id: "a-auto", label: "Open Autonomous SEO", href: "/admin/seo/autonomous", group: "Actions" },
  { id: "a-costs", label: "Open AI costs", href: "/admin/executive", group: "Actions" },
  { id: "a-sources", label: "Open sources", href: "/admin/sources", group: "Actions" },
  { id: "a-districts", label: "Open districts", href: "/admin/districts", group: "Actions" },
  { id: "a-settings", label: "Open settings", href: "/admin/settings", group: "Actions" },
  { id: "a-team", label: "Open team", href: "/admin/team", group: "Actions" },
];

type CommandMenuProps = {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
  role?: DashboardRole | string | null;
};

export function CommandMenu({
  open,
  onClose,
  initialQuery = "",
  role = null,
}: CommandMenuProps) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  useEffect(() => {
    if (open) setQ(initialQuery);
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const items = useMemo(() => {
    const canonical = role ? normalizeDashboardRole(String(role)) : null;
    const workspaces = canonical
      ? workspacesForRole(canonical)
      : ADMIN_WORKSPACES;

    const routes: CommandItem[] = [];
    for (const ws of workspaces) {
      for (const item of ws.items) {
        if (canonical) {
          if (
            (item.href === "/admin/team" || item.href === "/admin/schema") &&
            !isSuperAdmin(canonical)
          ) {
            continue;
          }
          if (!canAccessAdminRoute(canonical, item.href)) continue;
        }
        routes.push({
          id: item.href,
          label: item.label,
          href: item.href,
          group: ws.label,
        });
      }
    }

    const actions = ACTIONS.filter((a) => {
      if (!canonical) return true;
      if (a.href === "/admin/team" && !isSuperAdmin(canonical)) return false;
      return canAccessAdminRoute(canonical, a.href);
    });

    const all = [...actions, ...routes];
    const needle = q.trim().toLowerCase();
    if (!needle) return all.slice(0, 28);
    return all
      .filter(
        (i) =>
          i.label.toLowerCase().includes(needle) ||
          i.href.toLowerCase().includes(needle) ||
          i.group.toLowerCase().includes(needle)
      )
      .slice(0, 28);
  }, [q, role]);

  if (!open) return null;

  return (
    <div className="av3-cmd" role="dialog" aria-modal="true" aria-label="Command menu">
      <button
        type="button"
        className="av3-cmd__backdrop"
        aria-label="Close command menu"
        onClick={onClose}
      />
      <div className="av3-cmd__panel">
        <header className="av3-cmd__head">
          <input
            autoFocus
            className="av3-cmd__input"
            placeholder="Search routes, stories, settings, actions…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && items[0]) {
                router.push(items[0].href);
                onClose();
              }
            }}
          />
          <button
            type="button"
            className="av3-btn av3-btn--ghost av3-cmd__close"
            aria-label="Close search"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <ul className="av3-cmd__list">
          {items.map((item) => (
            <li key={`${item.group}-${item.id}`}>
              <button
                type="button"
                className="av3-cmd__item"
                onClick={() => {
                  router.push(item.href);
                  onClose();
                }}
              >
                <span>{item.label}</span>
                <em>{item.group}</em>
              </button>
            </li>
          ))}
          {items.length === 0 ? (
            <li className="av3-cmd__empty">No matches. Try a route name or action.</li>
          ) : null}
        </ul>
        {q.trim().length > 1 ? (
          <button
            type="button"
            className="av3-cmd__footer"
            onClick={() => {
              router.push(`/admin/stories?q=${encodeURIComponent(q.trim())}`);
              onClose();
            }}
          >
            Search stories for “{q.trim()}”
          </button>
        ) : null}
      </div>
    </div>
  );
}
