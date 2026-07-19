"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_WORKSPACES } from "@/lib/admin-platform/workspaces";

type CommandItem = {
  id: string;
  label: string;
  href: string;
  group: string;
};

const ACTIONS: CommandItem[] = [
  { id: "a-stories", label: "Open story queue", href: "/admin/stories", group: "Actions" },
  { id: "a-health", label: "Open platform health", href: "/admin/health", group: "Actions" },
  { id: "a-gsc", label: "Open Search Console", href: "/admin/seo/search-console", group: "Actions" },
  { id: "a-auto", label: "Open Autonomous SEO", href: "/admin/seo/autonomous", group: "Actions" },
  { id: "a-costs", label: "Open AI costs", href: "/admin/executive", group: "Actions" },
];

type CommandMenuProps = {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
};

export function CommandMenu({ open, onClose, initialQuery = "" }: CommandMenuProps) {
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
    const routes: CommandItem[] = [];
    for (const ws of ADMIN_WORKSPACES) {
      for (const item of ws.items) {
        routes.push({
          id: item.href,
          label: item.label,
          href: item.href,
          group: ws.label,
        });
      }
    }
    const all = [...ACTIONS, ...routes];
    const needle = q.trim().toLowerCase();
    if (!needle) return all.slice(0, 24);
    return all
      .filter(
        (i) =>
          i.label.toLowerCase().includes(needle) ||
          i.href.toLowerCase().includes(needle) ||
          i.group.toLowerCase().includes(needle)
      )
      .slice(0, 24);
  }, [q]);

  if (!open) return null;

  return (
    <div className="av3-cmd" role="dialog" aria-modal="true" aria-label="Command menu">
      <button type="button" className="av3-cmd__backdrop" aria-label="Close command menu" onClick={onClose} />
      <div className="av3-cmd__panel">
        <input
          autoFocus
          className="av3-cmd__input"
          placeholder="Search routes, stories, actions…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && items[0]) {
              router.push(items[0].href);
              onClose();
            }
          }}
        />
        <ul className="av3-cmd__list">
          {items.map((item) => (
            <li key={item.id}>
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
