"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";

type Tone = "critical" | "warning" | "neutral";

type Item = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  explanation: string;
  source: string;
  timestamp: string;
  href: string;
  unread: boolean;
};

export function NotificationCentre() {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<Tone>("neutral");
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notifications", { credentials: "include" });
      const json = await res.json();
      if (!json.ok) {
        setError("Unable to load alerts");
        return;
      }
      setTone((json.tone as Tone) ?? "neutral");
      setUnread(Number(json.unread) || 0);
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch {
      setError("Unable to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (!cancelled) void load();
    };
    const start = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
      window.clearInterval(id);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [open, load]);

  return (
    <div className="av3-bell anr-bell">
      <button
        type="button"
        className={`av3-btn av3-btn--ghost anr-bell__trigger anr-bell__trigger--${tone}`}
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
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
            className="av3-cmd__backdrop"
            style={{ zIndex: 55 }}
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div className="anr-bell__panel av3-bell__panel" role="dialog" aria-label="Notification centre">
            <header className="anr-bell__head">
              <strong>Attention</strong>
              <button
                type="button"
                className="av3-btn av3-btn--ghost"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X size={14} />
              </button>
            </header>
            {loading && items.length === 0 ? (
              <p className="av3-meta" style={{ padding: "0.85rem" }}>
                Loading alerts…
              </p>
            ) : null}
            {error ? (
              <p className="av3-meta" style={{ padding: "0.85rem", color: "#fda4af" }}>
                {error}
              </p>
            ) : null}
            {!loading && !error && items.length === 0 ? (
              <p className="av3-meta" style={{ padding: "0.85rem" }}>
                No unresolved operational alerts.
              </p>
            ) : null}
            <ul className="anr-bell__list">
              {items.map((item) => (
                <li key={item.id} className={`anr-bell__item anr-bell__item--${item.severity}`}>
                  <Link href={item.href} onClick={() => setOpen(false)}>
                    <strong>{item.title}</strong>
                    <span>{item.explanation}</span>
                    <em>
                      {item.source} · {new Date(item.timestamp).toLocaleString()}
                    </em>
                  </Link>
                </li>
              ))}
            </ul>
            <footer style={{ padding: "0.55rem 0.85rem", borderTop: "1px solid var(--anr-border)" }}>
              <Link href="/admin/health" onClick={() => setOpen(false)} style={{ fontSize: "0.78rem", color: "#fca5a5" }}>
                Open Platform health
              </Link>
            </footer>
          </div>
        </>
      ) : null}
    </div>
  );
}
