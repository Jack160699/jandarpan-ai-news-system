"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin/editorial";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    errorParam === "forbidden"
      ? "Your account does not have access to this newsroom console."
      : null
  );
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/dashboard/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? json.message ?? "Invalid credentials");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    await fetch("/api/dashboard/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.refresh();
  }

  return (
    <div className="saas-login">
      <div className="saas-login__card">
        <p className="text-xs uppercase tracking-widest text-amber-500">Jan Darpan OS</p>
        <h1>Newsroom Admin Login</h1>
        <p>Secure Supabase authentication for editorial operations.</p>
        {error ? <p className="saas-login__error">{error}</p> : null}
        <form onSubmit={onSubmit}>
          <div className="saas-login__field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
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
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="saas-login__submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in to admin"}
          </button>
        </form>
        <button
          type="button"
          className="saas-login__submit"
          style={{ marginTop: "0.5rem", background: "transparent", border: "1px solid #3f3f46" }}
          onClick={onLogout}
        >
          Sign out existing session
        </button>
      </div>
    </div>
  );
}
