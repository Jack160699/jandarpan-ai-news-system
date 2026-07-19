"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, Bell, ChevronDown, Info, X } from "lucide-react";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { ADMIN_POLL } from "@/lib/admin-v3/admin-poll";

type FilterTab = "all" | "critical" | "editorial" | "platform";

function severityIcon(severity: "critical" | "warning" | "info") {
  if (severity === "critical") return AlertCircle;
  if (severity === "warning") return AlertTriangle;
  return Info;
}

function matchesFilter(
  item: { severity: string; source: string },
  filter: FilterTab
): boolean {
  if (filter === "all") return true;
  if (filter === "critical") return item.severity === "critical";
  if (filter === "editorial") {
    return item.source.toLowerCase().includes("editorial");
  }
  return !item.source.toLowerCase().includes("editorial");
}

export function NotificationCentre() {
  const [open, setOpen] = useState(false);
  const {
    items,
    unread,
    tone,
    loading,
    error,
    refresh,
    acknowledge,
    markReadRemote,
    cacheAgeMs,
  } = useAdminNotifications();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Refetch only when cached feed is stale — not on every open.
    if (cacheAgeMs() >= ADMIN_POLL.clientStaleMs) {
      void refresh(true);
    }
  }, [open, refresh, cacheAgeMs]);

  useEffect(() => {
    if (!open) return;

    document.body.classList.add("av3-body-lock");

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function onPointer(e: MouseEvent) {
      const target = e.target as Node | null;
      if (wrapRef.current && target && !wrapRef.current.contains(target)) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      document.body.classList.remove("av3-body-lock");
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const visibleItems = useMemo(() => {
    return items
      .filter((item) => matchesFilter(item, filter))
      .map((item) => ({
        ...item,
        unread: item.unread && !readIds.has(item.id),
      }));
  }, [filter, items, readIds]);

  const filterTabs = useMemo(() => {
    const tabs: FilterTab[] = ["all"];
    if (items.some((item) => item.severity === "critical")) tabs.push("critical");
    if (items.some((item) => item.source.toLowerCase().includes("editorial"))) {
      tabs.push("editorial");
    }
    if (items.some((item) => !item.source.toLowerCase().includes("editorial"))) {
      tabs.push("platform");
    }
    return tabs;
  }, [items]);

  const showFilters = filterTabs.length > 2;

  function markReadLocal(id: string) {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  return (
    <div className="av3-bell anr-bell" ref={wrapRef}>
      <button
        type="button"
        className={`av3-btn av3-btn--ghost anr-bell__trigger anr-bell__trigger--${tone}`}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={16} aria-hidden />
        {unread > 0 ? (
          <span className="anr-bell__badge" aria-hidden>
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="av3-cmd__backdrop anr-bell__scrim"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div
            className="anr-bell__panel av3-bell__panel"
            role="dialog"
            aria-label="Notification centre"
          >
            <header className="anr-bell__head">
              <div>
                <strong>Attention</strong>
                <span className="av3-meta">{visibleItems.length} alerts</span>
              </div>
              <button
                type="button"
                className="av3-btn av3-btn--ghost"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X size={14} />
              </button>
            </header>

            {showFilters ? (
              <div className="anr-bell__filters" role="tablist" aria-label="Filter alerts">
                {filterTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={filter === tab}
                    className={`anr-bell__filter ${filter === tab ? "anr-bell__filter--active" : ""}`}
                    onClick={() => setFilter(tab)}
                  >
                    {tab === "all"
                      ? "All"
                      : tab === "critical"
                        ? "Critical"
                        : tab === "editorial"
                          ? "Editorial"
                          : "Platform"}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="anr-bell__body">
              {loading && items.length === 0 ? (
                <p className="av3-meta">Loading alerts…</p>
              ) : null}
              {error ? <p className="anr-bell__error">{error}</p> : null}
              {!loading && !error && visibleItems.length === 0 ? (
                <p className="av3-meta">No unresolved operational alerts.</p>
              ) : null}
              <ul className="anr-bell__list">
                {visibleItems.map((item) => {
                  const Icon = severityIcon(item.severity);
                  const expanded = expandedId === item.id;
                  const summary =
                    item.explanation.length > 96 && !expanded
                      ? `${item.explanation.slice(0, 96)}…`
                      : item.explanation;

                  return (
                    <li
                      key={item.id}
                      className={`anr-bell__item anr-bell__item--${item.severity} ${
                        item.unread ? "anr-bell__item--unread" : ""
                      }`}
                    >
                      <div className="anr-bell__item-row">
                        <Icon size={14} aria-hidden className="anr-bell__sev-icon" />
                        <div className="anr-bell__item-main">
                          <div className="anr-bell__item-head">
                            <strong>{item.title}</strong>
                            <time dateTime={item.timestamp}>
                              {new Date(item.timestamp).toLocaleString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "numeric",
                                month: "short",
                              })}
                            </time>
                          </div>
                          <p>{summary}</p>
                          <em>
                            {item.source}
                            {item.explanation.length > 96 ? (
                              <button
                                type="button"
                                className="anr-bell__expand"
                                onClick={() =>
                                  setExpandedId((id) => (id === item.id ? null : item.id))
                                }
                              >
                                {expanded ? "Less" : "More"}
                                <ChevronDown
                                  size={12}
                                  aria-hidden
                                  style={{
                                    transform: expanded ? "rotate(180deg)" : undefined,
                                  }}
                                />
                              </button>
                            ) : null}
                          </em>
                          <div className="anr-bell__item-actions">
                            <Link
                              href={item.href}
                              onClick={() => {
                                markReadLocal(item.id);
                                setOpen(false);
                              }}
                            >
                              Open
                            </Link>
                            {item.unread ? (
                              <button
                                type="button"
                                onClick={() => {
                                  markReadLocal(item.id);
                                  if (item.id.startsWith("collab-")) {
                                    void markReadRemote(item.id);
                                  } else {
                                    void acknowledge(item.id);
                                  }
                                }}
                              >
                                {item.id.startsWith("collab-") ? "Mark read" : "Acknowledge"}
                              </button>
                            ) : null}
                            <Link
                              href="/admin/health"
                              onClick={() => setOpen(false)}
                            >
                              Diagnostics
                            </Link>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <footer className="anr-bell__foot">
              <Link href="/admin/health" onClick={() => setOpen(false)}>
                Open Platform health
              </Link>
            </footer>
          </div>
        </>
      ) : null}
    </div>
  );
}
