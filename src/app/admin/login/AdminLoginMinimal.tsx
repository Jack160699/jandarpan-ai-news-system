"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { traceAdminEmergency } from "@/lib/admin/emergency-mode";

const LOGO_SRC = "/brand/jan-darpan-mark.svg";

/**
 * Zero-bootstrap login — no session probe, no redirects, no providers.
 */
export function AdminLoginMinimal() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    traceAdminEmergency("CLIENT_HYDRATION", "login_minimal_mounted");
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    traceAdminEmergency("LOGIN_RENDER", "submit");

    try {
      const res = await fetch("/api/dashboard/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(String(json.error ?? json.message ?? "Sign-in failed"));
        return;
      }
      window.location.assign("/admin/editorial");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="anr-login anr-login--compact anr-login--emergency">
      <div className="anr-login__inner anr-login__inner--compact">
        <header className="anr-login__brand anr-login__brand--stack">
          <Image
            src={LOGO_SRC}
            alt="Jan Darpan"
            width={56}
            height={56}
            className="anr-login__logo-img"
            priority
          />
          <div className="anr-login__headings">
            <h1 className="anr-login__title">Jan Darpan OS</h1>
            <p className="anr-login__subtitle">Newsroom Console · Recovery</p>
          </div>
        </header>

        {error ? (
          <p className="anr-login__error" role="alert">
            {error}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="anr-login__emergency-form">
          <label className="anr-login__label" htmlFor="emergency-email">
            Email
          </label>
          <input
            id="emergency-email"
            className="anr-input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />

          <label className="anr-login__label" htmlFor="emergency-password">
            Password
          </label>
          <input
            id="emergency-password"
            className="anr-input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />

          <button type="submit" className="anr-btn anr-btn--primary" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
