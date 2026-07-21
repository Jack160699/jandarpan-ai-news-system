"use client";

import Link from "next/link";
import { useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useSupabase } from "@/hooks/useSupabase";

/** Legacy reader login (NEXT_PUBLIC_READER_DS off). */
export default function LegacyLoginPage() {
  const { language } = useLanguage();
  const { signInWithGoogle, isLoggedIn, displayName } = useReaderAccount();
  const { client } = useSupabase();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  const title = pickBilingualLabel(language, "Reader Account", "रीडर अकाउंट");

  async function sendEmailLink() {
    if (!client || !email.trim()) return;
    setStatus(null);
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setStatus(
      error
        ? error.message
        : pickBilingualLabel(
            language,
            "Check your email for the login link.",
            "लॉगिन लिंक के लिए ईमेल देखें।"
          )
    );
  }

  async function sendPhoneOtp() {
    if (!client || !phone.trim()) return;
    setStatus(null);
    const { error } = await client.auth.signInWithOtp({ phone: phone.trim() });
    setStatus(
      error
        ? error.message
        : pickBilingualLabel(
            language,
            "OTP sent if the number is valid.",
            "नंबर सही होने पर OTP भेजा गया।"
          )
    );
  }

  if (isLoggedIn) {
    return (
      <PageShell>
        <main id="main-content" role="main" className="pl-container mx-auto max-w-md py-10 pb-24">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-stone-600 dark:text-stone-300">
            {pickBilingualLabel(language, "Signed in as", "लॉगिन:")} {displayName}
          </p>
          <Link href="/" className="mt-6 inline-flex font-semibold text-[#a01830]">
            ← {pickBilingualLabel(language, "Home", "होम")}
          </Link>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main id="main-content" role="main" className="pl-container mx-auto max-w-md py-10 pb-24">
        <Link
          href="/"
          className="mb-6 inline-flex text-sm font-semibold text-[#a01830] no-underline"
        >
          ← {pickBilingualLabel(language, "Back", "वापस")}
        </Link>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">{title}</h1>
        <p className="mt-2 text-sm text-stone-500">
          {pickBilingualLabel(
            language,
            "Sign in to personalize your feed. Saved stories stay on this device until cloud sync launches.",
            "फ़ीड पर्सनलाइज़ करने के लिए साइन इन करें। सेव की गई खबरें अभी इसी डिवाइस पर रहती हैं।"
          )}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            className="min-h-11 rounded-full bg-stone-900 px-4 text-sm font-bold text-white dark:bg-stone-100 dark:text-stone-900"
            onClick={() => void signInWithGoogle()}
          >
            {pickBilingualLabel(language, "Continue with Google", "Google से जारी रखें")}
          </button>

          {!configured ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {pickBilingualLabel(
                language,
                "Supabase not configured — Google/OTP require env keys.",
                "Supabase कॉन्फ़िग नहीं — Google/OTP के लिए env keys चाहिए।"
              )}
            </p>
          ) : null}

          <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-stone-500">
            {pickBilingualLabel(language, "Email magic link", "ईमेल लिंक")}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
            placeholder="you@example.com"
          />
          <button
            type="button"
            className="min-h-10 rounded-xl border border-stone-200 text-sm font-semibold dark:border-stone-700"
            onClick={() => void sendEmailLink()}
            disabled={!configured}
          >
            {pickBilingualLabel(language, "Send email link", "ईमेल लिंक भेजें")}
          </button>

          <label className="mt-2 block text-xs font-bold uppercase tracking-wide text-stone-500">
            {pickBilingualLabel(language, "Phone OTP", "फ़ोन OTP")}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
            placeholder="+91"
          />
          <button
            type="button"
            className="min-h-10 rounded-xl border border-stone-200 text-sm font-semibold dark:border-stone-700"
            onClick={() => void sendPhoneOtp()}
            disabled={!configured}
          >
            {pickBilingualLabel(language, "Send OTP", "OTP भेजें")}
          </button>
        </div>

        {status ? (
          <p className="mt-4 text-sm text-stone-600 dark:text-stone-300">{status}</p>
        ) : null}
      </main>
    </PageShell>
  );
}
