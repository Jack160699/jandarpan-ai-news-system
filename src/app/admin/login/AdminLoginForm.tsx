"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

const REMEMBER_KEY = "jd-admin-login-email";

function friendlyError(code: string | undefined): string {
  const map: Record<string, string> = {
    forbidden: "Your account does not have access to this newsroom console.",
    email_password_required: "Email and password are required.",
    invalid_json: "Invalid request. Please try again.",
    auth_unavailable: "Authentication is temporarily unavailable.",
    configure_supabase: "Supabase is not configured for this environment.",
  };
  if (!code) return "Invalid credentials. Please try again.";
  return map[code] ?? code.replace(/_/g, " ");
}

export function AdminLoginForm() {
  const router = useRouter();
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
      router.replace(next);
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="anr-login">
      <div className="anr-login__bg" aria-hidden>
        <div className="anr-login__orb anr-login__orb--1" />
        <div className="anr-login__orb anr-login__orb--2" />
        <div className="anr-login__orb anr-login__orb--3" />
        <div className="anr-login__grid" />
        <div className="anr-login__vignette" />
      </div>

      <div className="anr-login__inner">
        <header className="anr-login__brand">
          <div className="anr-login__logo" aria-hidden>
            JD
          </div>
          <div>
            <p className="anr-login__eyebrow">Jan Darpan OS</p>
            <h1 className="anr-login__title">Newsroom Console</h1>
          </div>
        </header>

        <Card className="anr-login__card border-zinc-800/80 bg-zinc-950/40 text-zinc-100 shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-1 border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2 text-amber-500">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-widest">
                Secure access
              </span>
            </div>
            <CardTitle className="text-xl font-semibold tracking-tight text-zinc-50">
              Sign in to admin
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Supabase-authenticated editorial desk for Chhattisgarh AI newsroom
              operations.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {error ? (
              <div
                className="mb-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2.5 text-sm text-red-200"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="admin-email"
                  className="text-xs font-medium uppercase tracking-wide text-zinc-400"
                >
                  Work email
                </label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="editor@newsroom.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                  className="h-11 border-zinc-700/80 bg-zinc-900/80 focus-visible:ring-amber-500/50"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="admin-password"
                  className="text-xs font-medium uppercase tracking-wide text-zinc-400"
                >
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                    className="h-11 border-zinc-700/80 bg-zinc-900/80 pr-10 focus-visible:ring-amber-500/50"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-amber-500 focus:ring-amber-500/40"
                />
                Remember email on this device
              </label>

              <Button
                type="submit"
                disabled={busy}
                className={cn(
                  "h-11 w-full border-0 bg-gradient-to-r from-amber-500 to-orange-600",
                  "font-semibold text-zinc-950 shadow-lg shadow-amber-500/20",
                  "hover:from-amber-400 hover:to-orange-500"
                )}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in to newsroom"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <footer className="anr-login__footer">
          <p>
            Session secured with httpOnly cookies · Role-based editorial access
          </p>
          <p className="anr-login__footer-muted">
            Jan Darpan Chhattisgarh · Internal use only
          </p>
        </footer>
      </div>
    </div>
  );
}
