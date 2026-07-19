"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const LOGO_SRC = "/brand/jan-darpan-mark.png";

type Phase = "loading" | "ready" | "invalid" | "success";

export default function AdminResetPasswordPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function establishSessionFromHash() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !anon) {
        if (!cancelled) setPhase("invalid");
        return;
      }

      const supabase = createBrowserClient(url, anon);

      // Supabase recovery links land with hash tokens
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash.includes("access_token") || hash.includes("type=recovery")) {
        const params = new URLSearchParams(hash.replace(/^#/, ""));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionError) {
            if (!cancelled) setPhase("invalid");
            return;
          }
        }
      }

      const { data, error: userError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (userError || !data.user) {
        setPhase("invalid");
        return;
      }
      setPhase("ready");
    }

    void establishSessionFromHash();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/dashboard/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!json.ok) {
        const map: Record<string, string> = {
          invalid_or_expired_token:
            "This reset link is invalid or has expired. Request a new one.",
          password_too_short: "Password must be at least 8 characters.",
          password_unchanged: "Choose a different password.",
        };
        setError(map[json.error] ?? "Unable to reset password. Try again.");
        if (json.error === "invalid_or_expired_token") setPhase("invalid");
        return;
      }
      setPhase("success");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
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
            alt="Jandarpan.news"
            width={56}
            height={56}
            className="anr-login__logo-img"
            priority
          />
          <div className="anr-login__headings">
            <h1 className="anr-login__title">Choose a new password</h1>
            <p className="anr-login__subtitle">Jandarpan.news admin</p>
          </div>
        </header>

        <Card className="anr-login__card border-zinc-800/70 bg-zinc-950/50 text-zinc-100 shadow-2xl backdrop-blur-xl">
          <CardContent className="p-6 pt-6">
            {phase === "loading" ? (
              <p className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Validating reset link…
              </p>
            ) : null}

            {phase === "invalid" ? (
              <div className="space-y-4">
                <p className="text-sm text-red-200" role="alert">
                  This reset link is invalid or has expired.
                </p>
                <Link
                  href="/admin/forgot-password"
                  className="text-sm font-medium text-amber-400 hover:text-amber-300"
                >
                  Request a new link
                </Link>
              </div>
            ) : null}

            {phase === "success" ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-300" role="status">
                  Your password has been updated. You can now sign in.
                </p>
                <Link
                  href="/admin/login"
                  className="inline-flex h-10 w-full items-center justify-center rounded-md bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-semibold text-zinc-950"
                >
                  Sign in
                </Link>
              </div>
            ) : null}

            {phase === "ready" ? (
              <>
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
                    <label htmlFor="new-password" className="anr-login__label">
                      New password
                    </label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
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
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="confirm-password" className="anr-login__label">
                      Confirm password
                    </label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      disabled={busy}
                      className="h-10 border-zinc-700/80 bg-zinc-900/90 focus-visible:ring-amber-500/45"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={busy}
                    className="h-10 w-full border-0 bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-semibold text-zinc-950"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating…
                      </>
                    ) : (
                      "Update password"
                    )}
                  </Button>
                </form>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
