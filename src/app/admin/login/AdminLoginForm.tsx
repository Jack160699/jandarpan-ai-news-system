"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { resolveAdminLanding } from "@/lib/admin-platform/role-landing";
import { JAN_DARPAN_BRAND_ASSETS } from "@/lib/brand/assets";

const REMEMBER_KEY = "jd-admin-login-email";

function friendlyError(code: string | undefined): string {
  const map: Record<string, string> = {
    forbidden: "You do not have access to this newsroom.",
    no_membership: "No active newsroom membership for this account.",
    email_password_required: "Enter your email and password.",
    invalid_json: "Something went wrong. Try again.",
    auth_unavailable: "Sign-in is temporarily unavailable.",
    configure_supabase: "Newsroom auth is not configured.",
    account_locked: "Account temporarily locked. Try again later.",
    rate_limited: "Too many attempts. Try again later.",
    session_recovery_failed: "Session expired. Please sign in again.",
  };
  if (!code) return "Invalid email or password.";
  return map[code] ?? code.replace(/_/g, " ");
}

export function AdminLoginForm() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const errorParam = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam ? friendlyError(errorParam) : null
  );
  const [busy, setBusy] = useState(false);
  const [healthLine, setHealthLine] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const remembered = window.localStorage.getItem(REMEMBER_KEY) ?? "";
        if (remembered) {
          setEmail(remembered);
          setRemember(true);
        }
      } catch {
        /* ignore */
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function probe() {
      let reachable = false;
      try {
        const liveRes = await fetch("/api/health/live");
        reachable = liveRes.ok;
      } catch {
        reachable = false;
      }

      if (!reachable) {
        if (!cancelled) setHealthLine("Status unavailable");
        return;
      }

      try {
        const statusRes = await fetch("/api/status/production");
        if (statusRes.ok) {
          const json = (await statusRes.json()) as {
            label?: string;
            state?: string;
          };
          if (!cancelled) {
            setHealthLine(
              typeof json.label === "string" ? json.label : "Production reachable"
            );
          }
          return;
        }
      } catch {
        /* fall through to reachable-only */
      }

      if (!cancelled) setHealthLine("Production reachable");
    }

    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
      else localStorage.removeItem(REMEMBER_KEY);

      const res = await fetch("/api/dashboard/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(friendlyError(json.error ?? json.message));
        return;
      }
      const role = json.membership?.role ?? json.role ?? null;
      window.location.assign(resolveAdminLanding(role, nextParam));
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="anr-login-v2">
      <div className="anr-login-v2__visual" aria-hidden>
        <div className="anr-login-v2__grid" />
        <div className="anr-login-v2__glow anr-login-v2__glow--red" />
        <div className="anr-login-v2__glow anr-login-v2__glow--blue" />
        <div className="anr-login-v2__visual-inner">
          <Image
            src={JAN_DARPAN_BRAND_ASSETS.logo}
            alt=""
            width={320}
            height={64}
            className="anr-login-v2__hero-logo"
            priority
          />
          <h1>Jan Darpan Command Centre</h1>
          <p>Editorial intelligence. Business control. Platform reliability.</p>
          {healthLine ? (
            <span
              className={`anr-login-v2__status ${
                healthLine === "Production healthy"
                  ? "anr-login-v2__status--healthy"
                  : healthLine === "Status unavailable"
                    ? "anr-login-v2__status--unknown"
                    : healthLine.includes("incident") || healthLine.includes("Critical")
                      ? "anr-login-v2__status--critical"
                      : healthLine.includes("degraded") || healthLine.includes("Warning")
                        ? "anr-login-v2__status--warning"
                        : "anr-login-v2__status--neutral"
              }`}
            >
              {healthLine}
            </span>
          ) : null}
        </div>
      </div>

      <div className="anr-login-v2__panel">
        <div className="anr-login-v2__card">
          <header className="anr-login-v2__card-head">
            <Image
              src={JAN_DARPAN_BRAND_ASSETS.logo}
              alt="Jan Darpan"
              width={160}
              height={32}
              className="anr-login-v2__mark"
              priority
            />
            <div>
              <h2>Sign in</h2>
              <p>Admin access for Jandarpan.news</p>
            </div>
          </header>

          {error ? (
            <div className="anr-login-v2__error" role="alert">
              {error}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="anr-login-v2__form">
            <div className="anr-login-v2__field">
              <label htmlFor="admin-email">Email</label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
            </div>

            <div className="anr-login-v2__field">
              <div className="anr-login-v2__label-row">
                <label htmlFor="admin-password">Password</label>
                <Link href="/admin/forgot-password">Forgot password?</Link>
              </div>
              <div className="anr-login-v2__password">
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="anr-login-v2__remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember email
            </label>

            <Button
              type="submit"
              disabled={busy}
              className={cn("anr-login-v2__submit", busy && "opacity-80")}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
