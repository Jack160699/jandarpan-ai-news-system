"use client";

import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { cn } from "@/design-system/utils/cn";
import { NOSNIPPET_ATTRS } from "@/lib/monetization/seo";
import { useMonetization } from "@/providers/MonetizationProvider";
import { useLanguage } from "@/providers/LanguageProvider";

export type NewsletterSignupProps = {
  slotId?: string;
  newsletterSlug?: string;
  className?: string;
};

/**
 * JDP-020 — Newsletter signup card (V3 presentation).
 * Uses existing newsletter API — no payment integration.
 */
export function NewsletterSignup({
  slotId = "story_footer",
  newsletterSlug,
  className,
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
      className={cn("mnv3-newsletter mnv3-enter", className)}
      role="complementary"
      aria-label="Newsletter signup"
      {...NOSNIPPET_ATTRS}
    >
      <header className="mnv3-newsletter__header">
        <h3 className="mnv3-newsletter__title">{title}</h3>
        {offer.description ? (
          <p className="mnv3-newsletter__desc">{offer.description}</p>
        ) : (
          <p className="mnv3-newsletter__desc">
            Get the morning briefing and member launch updates in your inbox.
          </p>
        )}
      </header>

      <form className="mnv3-newsletter__form" onSubmit={submit}>
        <input
          type="email"
          required
          className="mnv3-newsletter__input"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email address"
          disabled={busy}
        />
        <Button type="submit" variant="primary" size="md" isLoading={busy}>
          Subscribe
        </Button>
      </form>

      {status === "ok" ? (
        <p className="mnv3-newsletter__status mnv3-newsletter__status--ok">
          Thanks — you&apos;re subscribed to this edition.
        </p>
      ) : null}
      {status === "err" ? (
        <p className="mnv3-newsletter__status mnv3-newsletter__status--err">
          Could not subscribe. Please try again.
        </p>
      ) : null}
    </section>
  );
}
