"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

const REMEMBER_KEY = "jd-admin-login-email";
const LOGO_SRC = "/brand/jan-darpan-mark.svg";

function friendlyError(code: string | undefined): string {
  const map: Record<string, string> = {
    forbidden: "You do not have access to this newsroom.",
    no_membership: "No active newsroom membership for this account.",
    email_password_required: "Enter your email and password.",
    invalid_json: "Something went wrong. Try again.",
    auth_unavailable: "Sign-in is temporarily unavailable.",
    configure_supabase: "Newsroom auth is not configured.",
  };
  if (!code) return "Invalid email or password.";
  return map[code] ?? code.replace(/_/g, " ");
}

export function AdminLoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin/editorial";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam ? friendlyError(errorParam) : null
  );
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(REMEMBER_KEY);
      if (stored) {
        setEmail(stored);
        setRemember(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/auth/session", {
          credentials: "include",
          cache: "no-store",
        });
        if (!cancelled && res.ok) {
          const json = await res.json();
          if (json.ok) {
            window.location.replace(next);
            return;
          }
        }
      } catch {
        /* not signed in */
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, email.trim());
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

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

      // Full navigation ensures Set-Cookie headers are applied before RSC/middleware run
      window.location.assign(next);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="anr-login anr-login--compact">
        <div className="anr-login__bg" aria-hidden />
        <div className="anr-login__inner anr-login__inner--center">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" aria-label="Loading" />
        </div>
      </div>
    );
  }

  return (
    <div className="anr-login anr-login--compact">
      <div className="anr-login__bg" aria-hidden>
        <div className="anr-login__orb anr-login__orb--1" />
        <div className="anr-login__orb anr-login__orb--2" />
        <div className="anr-login__grid" />
        <div className="anr-login__vignette" />
      </div>

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
            <p className="anr-login__subtitle">Newsroom Console</p>
          </div>
        </header>

        <Card className="anr-login__card border-zinc-800/70 bg-zinc-950/50 text-zinc-100 shadow-2xl backdrop-blur-xl">
          <CardContent className="p-6 pt-6">
            {error ? (
              <div
                className="mb-4 rounded-md border border-red-500/25 bg-red-950/50 px-3 py-2 text-sm text-red-200"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label htmlFor="admin-email" className="anr-login__label">
                  Email
                </label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                  className="h-10 border-zinc-700/80 bg-zinc-900/90 focus-visible:ring-amber-500/45"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-password" className="anr-login__label">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                    className="h-10 border-zinc-700/80 bg-zinc-900/90 pr-10 focus-visible:ring-amber-500/45"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-300"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-500">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-900 text-amber-500"
                />
                Remember me
              </label>

              <Button
                type="submit"
                disabled={busy}
                className={cn(
                  "h-10 w-full border-0 bg-gradient-to-r from-amber-500 to-orange-600",
                  "text-sm font-semibold text-zinc-950 shadow-md shadow-amber-500/25",
                  "hover:from-amber-400 hover:to-orange-500"
                )}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
