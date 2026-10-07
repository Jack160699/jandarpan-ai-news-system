"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { userNewsApi } from "@/features/user-news/api";
import { describePostNewsCard } from "@/features/user-news/post-news-card";
import type { PostNewsStatus } from "@/lib/user-news/service";
import type { UserNewsLocale } from "@/features/user-news/strings";

/**
 * The highlighted POST NEWS entry in Profile. It always tells the truth about why posting is or is not available:
 * verified -> a button; not verified / no verification service -> a lock and the exact reason. Never a fake "verified".
 */
export function PostNewsCard({ locale, isLoggedIn, initialStatus = null }: { locale: UserNewsLocale; isLoggedIn: boolean; initialStatus?: PostNewsStatus | null }) {
  const [status, setStatus] = useState<PostNewsStatus | null>(initialStatus);
  const [loading, setLoading] = useState(isLoggedIn && !initialStatus);

  useEffect(() => {
    if (!isLoggedIn || initialStatus) return;
    let cancelled = false;
    void userNewsApi.status().then((r) => {
      if (cancelled) return;
      if (r.ok) setStatus(r.data.status);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, initialStatus]);

  const m = describePostNewsCard({ loading, isLoggedIn, status, locale });
  const open = m.state === "open";

  return (
    <section
      aria-label={m.title}
      data-testid="post-news-card"
      data-state={m.state}
      style={{
        marginBottom: 20,
        borderRadius: 12,
        padding: "16px 16px 14px",
        color: open ? "#0a1628" : "#ffffff",
        background: open ? "linear-gradient(135deg, #f6d36b 0%, #e8b923 100%)" : "linear-gradient(135deg, #1b2a49 0%, #26385f 100%)",
        border: open ? "1px solid #c99a0a" : "1px solid rgba(255,255,255,0.18)",
        boxShadow: open ? "0 8px 24px rgba(201,154,10,0.35)" : "0 4px 14px rgba(10,22,40,0.18)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span aria-hidden="true" style={{ fontSize: 22 }}>{open ? "📰" : "🔒"}</span>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, letterSpacing: "0.04em" }}>{m.title}</h2>
        {m.badge ? (
          <span
            data-testid="verification-badge"
            style={{
              marginLeft: "auto",
              fontSize: 11,
              fontWeight: 800,
              padding: "3px 9px",
              borderRadius: 999,
              background: m.badge.tone === "verified" ? "#0f6b3a" : "rgba(255,255,255,0.18)",
              color: "#ffffff",
            }}
          >
            {m.badge.tone === "verified" ? "✓ " : ""}
            {m.badge.label}
          </span>
        ) : null}
      </div>

      <p style={{ margin: "8px 0 12px", fontSize: 13, lineHeight: 1.5, opacity: open ? 0.9 : 0.85 }} role={m.state === "locked" ? "status" : undefined}>
        {m.message}
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {m.primary ? (
          <Link href={m.primary.href} data-testid="post-news-cta" style={{ background: "#0a1628", color: "#f6d36b", padding: "10px 16px", borderRadius: 8, fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
            {m.primary.label}
          </Link>
        ) : null}
        {m.secondary ? (
          <Link href={m.secondary.href} data-testid="my-news-link" style={{ padding: "10px 4px", fontWeight: 700, fontSize: 13, color: open ? "#0a1628" : "#ffffff", textDecoration: "underline" }}>
            {m.secondary.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
