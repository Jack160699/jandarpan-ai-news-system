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
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [open, load]);

  return (
    <div className="anr-bell">
      <button
        type="button"
        className={`anr-btn anr-btn--ghost anr-bell__trigger anr-bell__trigger--${tone}`}
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications"
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
            className="anr-bell__scrim"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div className="anr-bell__panel" role="dialog" aria-label="Notification centre">
            <header className="anr-bell__head">
              <div>
                <strong>Attention</strong>
                <p className="anr-meta">
                  {unread > 0 ? `${unread} item${unread === 1 ? "" : "s"} need review` : "All clear"}
                </p>
              </div>
              <button
                type="button"
                className="anr-btn anr-btn--ghost"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </header>

            <div className="anr-bell__body">
              {loading && items.length === 0 ? (
                <p className="anr-meta">Loading alerts…</p>
              ) : null}
              {error ? <p className="anr-error">{error}</p> : null}
              {!loading && !error && items.length === 0 ? (
                <div className="anr-empty">
                  <p>No operational alerts right now.</p>
                  <p className="anr-meta">Publishing, queues, and health look quiet.</p>
                </div>
              ) : null}
              <ul className="anr-bell__list">
                {items.map((item) => (
                  <li key={item.id} className={`anr-bell__item anr-bell__item--${item.severity}`}>
                    <Link href={item.href} onClick={() => setOpen(false)}>
                      <span className="anr-bell__sev">{item.severity}</span>
                      <strong>{item.title}</strong>
                      <p>{item.explanation}</p>
                      <em>
                        {item.source} ·{" "}
                        {new Date(item.timestamp).toLocaleString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </em>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
