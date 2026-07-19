"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { getDistrict } from "@/lib/regional/districts";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";

type FoundingState = {
  ok: boolean;
  cap?: number;
  claimed?: number;
  remaining?: number;
  active?: boolean;
};

type ClaimState =
  | { phase: "idle" }
  | { phase: "claiming" }
  | { phase: "claimed"; position: number; already: boolean }
  | { phase: "error"; reason: string };

/**
 * स्थानीय पत्रकारिता का साथ दें — homepage support block with the live
 * first-1000 founding-membership counter (real DB state, never a fake number).
 */
export function SupportJournalismSection() {
  const { language } = useLanguage();
  const { isLoggedIn, signInWithGoogle } = useReaderAccount();
  const { prefs } = useReaderPreferences();
  const hi = language !== "en";

  const [founding, setFounding] = useState<FoundingState | null>(null);
  const [claim, setClaim] = useState<ClaimState>({ phase: "idle" });

  const districtSlug = prefs.homeDistrict ?? "raipur";
  const district = getDistrict(districtSlug) ?? getDistrict("raipur");
  const districtName = hi
    ? district?.nameHi ?? "रायपुर"
    : district?.name ?? "Raipur";

  const refreshStatus = useCallback(() => {
    fetch("/api/membership/founding")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setFounding(data as FoundingState);
      })
      .catch(() => {
        /* counter hidden when unavailable */
      });
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleClaim = useCallback(async () => {
    if (!isLoggedIn) {
      await signInWithGoogle();
      return;
    }
    setClaim({ phase: "claiming" });
    try {
      const res = await fetch("/api/membership/founding", { method: "POST" });
      const data = (await res.json()) as {
        ok: boolean;
        already?: boolean;
        position?: number;
        reason?: string;
      };
      if (data.ok && typeof data.position === "number") {
        setClaim({
          phase: "claimed",
          position: data.position,
          already: Boolean(data.already),
        });
        refreshStatus();
      } else {
        setClaim({ phase: "error", reason: data.reason ?? "claim_failed" });
      }
    } catch {
      setClaim({ phase: "error", reason: "network" });
    }
  }, [isLoggedIn, signInWithGoogle, refreshStatus]);

  const showOffer =
    founding?.ok &&
    founding.active !== false &&
    typeof founding.remaining === "number" &&
    founding.remaining > 0;

  return (
    <section
      className="home-v31-support"
      aria-labelledby="home-support-title"
      data-nosnippet
    >
      <p className="home-v31-support__kicker">
        {hi ? "जन दर्पण छत्तीसगढ़" : "Jan Darpan Chhattisgarh"}
      </p>
      <h2 id="home-support-title" className="home-v31-support__title">
        {hi ? "स्थानीय पत्रकारिता का साथ दें" : "Support local journalism"}
      </h2>
      <p className="home-v31-support__body">
        {hi
          ? "आपका साथ हमारे ज़िला संवाददाताओं को स्वतंत्र, ज़मीनी रिपोर्टिंग जारी रखने में मदद करता है। सदस्य बनें — सेव की गई खबरें, ज़िला अलर्ट और ऑडियो ब्रीफिंग पाएँ।"
          : "Your support keeps our district reporters doing independent, on-the-ground journalism. Become a member for saved stories, district alerts and audio briefings."}
      </p>

      <p className="home-v31-support__district">
        <MapPin size={13} aria-hidden />
        <span>
          {hi ? "आपका ज़िला:" : "Your district:"} <strong>{districtName}</strong>
        </span>
        <Link href="/districts" className="home-v31-support__change">
          {hi ? "बदलें" : "Change"}
        </Link>
      </p>

      {claim.phase === "claimed" ? (
        <p className="home-v31-support__claimed" role="status">
          {hi
            ? `बधाई हो! आप संस्थापक पाठक #${claim.position} हैं।`
            : `Congratulations! You are founding reader #${claim.position}.`}
        </p>
      ) : showOffer ? (
        <div className="home-v31-support__offer">
          <p className="home-v31-support__count" aria-live="polite">
            {hi
              ? `अभी ${founding!.remaining} निःशुल्क सदस्यताएँ बाकी हैं`
              : `${founding!.remaining} free memberships remaining`}
          </p>
          <button
            type="button"
            className="home-v31-support__cta tap-target"
            onClick={handleClaim}
            disabled={claim.phase === "claiming"}
          >
            {claim.phase === "claiming"
              ? hi
                ? "प्रक्रिया जारी…"
                : "Claiming…"
              : isLoggedIn
                ? hi
                  ? "निःशुल्क सदस्यता लें"
                  : "Claim free membership"
                : hi
                  ? "Google से साइन इन कर सदस्यता लें"
                  : "Sign in with Google to claim"}
          </button>
          {claim.phase === "error" ? (
            <p className="home-v31-support__error" role="alert">
              {hi
                ? "अभी सदस्यता नहीं मिल सकी — कृपया दोबारा कोशिश करें।"
                : "Could not claim right now — please try again."}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="home-v31-support__links">
        <Link href="/membership">
          {hi ? "सभी सदस्यता विकल्प देखें →" : "See all membership options →"}
        </Link>
      </p>
    </section>
  );
}
