"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const LOGO_SRC = "/brand/jan-darpan-mark.svg";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(
          json.error === "rate_limited"
            ? "Too many attempts. Try again later."
            : "Unable to send reset email. Try again."
        );
        return;
      }
      setDone(true);
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
            <h1 className="anr-login__title">Reset password</h1>
            <p className="anr-login__subtitle">Jandarpan.news admin</p>
          </div>
        </header>

        <Card className="anr-login__card border-zinc-800/70 bg-zinc-950/50 text-zinc-100 shadow-2xl backdrop-blur-xl">
          <CardContent className="p-6 pt-6">
            {done ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-300" role="status">
                  If an account exists for that email, a password reset link has
                  been sent. Check your inbox and spam folder.
                </p>
                <Link
                  href="/admin/login"
                  className="text-sm font-medium text-amber-400 hover:text-amber-300"
                >
                  Back to sign in
                </Link>
              </div>
            ) : (
              <>
                {error ? (
                  <div
                    className="mb-4 rounded-md border border-red-500/25 bg-red-950/50 px-3 py-2 text-sm text-red-200"
                    role="alert"
                  >
                    {error}
                  </div>
                ) : null}
                <p className="mb-4 text-sm text-zinc-400">
                  Enter your admin email and we will send a secure reset link.
                </p>
                <form onSubmit={onSubmit} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label htmlFor="reset-email" className="anr-login__label">
                      Email
                    </label>
                    <Input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                        Sending…
                      </>
                    ) : (
                      "Send reset link"
                    )}
                  </Button>
                </form>
                <p className="mt-4 text-center text-sm text-zinc-500">
                  <Link href="/admin/login" className="text-amber-400 hover:text-amber-300">
                    Back to sign in
                  </Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
