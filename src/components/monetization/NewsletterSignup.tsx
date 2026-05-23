"use client";

import { useState } from "react";
import { NOSNIPPET_ATTRS } from "@/lib/monetization/seo";
import { useMonetization } from "@/providers/MonetizationProvider";
import { useLanguage } from "@/providers/LanguageProvider";

type NewsletterSignupProps = {
  slotId?: string;
  newsletterSlug?: string;
};

export function NewsletterSignup({
  slotId = "story_footer",
  newsletterSlug,
}: NewsletterSignupProps) {
  const { newsletters, track } = useMonetization();
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [busy, setBusy] = useState(false);

  const offer = newsletters[0];
  if (!offer) return null;

  const title = language === "en" ? offer.nameEn : offer.nameHi ?? offer.nameEn;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/monetization/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          newsletterSlug: newsletterSlug ?? offer.slug,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setStatus("ok");
        track("newsletter_signup", { slotId, placementType: "newsletter" });
        setEmail("");
      } else {
        setStatus("err");
      }
    } catch {
      setStatus("err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="mnr-unit mnr-newsletter"
      role="complementary"
      aria-label="Newsletter signup"
      {...NOSNIPPET_ATTRS}
    >
      <h3>{title}</h3>
      {offer.description ? (
        <p className="anr-meta">{offer.description}</p>
      ) : null}
      <form onSubmit={submit}>
        <input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
        />
        <button type="submit" disabled={busy}>
          {busy ? "…" : "Subscribe"}
        </button>
      </form>
      {status === "ok" ? (
        <p className="anr-meta">Thanks — check your inbox to confirm.</p>
      ) : null}
      {status === "err" ? (
        <p className="anr-meta">Could not subscribe. Try again.</p>
      ) : null}
    </section>
  );
}
