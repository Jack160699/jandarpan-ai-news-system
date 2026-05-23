"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [devKey, setDevKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/dashboard/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || undefined,
          password: password || undefined,
          devKey: devKey || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Login failed");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="saas-login">
      <div className="saas-login__card">
        <h1>Newsroom Console</h1>
        <p>Sign in to manage your AI-powered newsroom.</p>
        {error ? <p className="saas-login__error">{error}</p> : null}
        <form onSubmit={onSubmit}>
          <div className="saas-login__field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="saas-login__field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="saas-login__field">
            <label htmlFor="devKey">Dev admin key (optional)</label>
            <input
              id="devKey"
              type="password"
              value={devKey}
              onChange={(e) => setDevKey(e.target.value)}
              placeholder="CRON_SECRET / ADMIN_SECRET"
            />
          </div>
          <button type="submit" className="saas-login__submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="anr-meta" style={{ marginTop: "1rem", color: "#71717a" }}>
          Development: leave credentials empty and use dev key, or sign in with
          Supabase Auth after creating a user and tenant membership.
        </p>
      </div>
    </div>
  );
}
