"use client";

import Link from "next/link";
import { Bell, Bookmark, Flame, Sparkles } from "lucide-react";
import { labelForLink, MENU_ACCOUNT_LINKS } from "@/lib/super-menu/config";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";

type SuperMenuProfileProps = {
  onNavigate: (href: string) => void;
};

export function SuperMenuProfile({ onNavigate }: SuperMenuProfileProps) {
  const { language } = useLanguage();
  const {
    mounted,
    isLoggedIn,
    displayName,
    avatarInitial,
    isPremium,
    streakDays,
    savedCount,
    signInWithGoogle,
    signOut,
  } = useReaderAccount();

  if (!mounted) {
    return (
      <div className="sm-profile sm-profile--skeleton" aria-hidden>
        <div className="sm-profile__card" style={{ minHeight: "4.5rem" }} />
      </div>
    );
  }

  return (
    <div className="sm-profile">
      <div className="sm-profile__card">
        <div className="sm-profile__avatar" aria-hidden>
          {avatarInitial}
        </div>
        <div className="sm-profile__meta">
          <p className="sm-profile__name">{displayName}</p>
          <div className="sm-profile__badges">
            {isPremium ? (
              <span className="sm-badge sm-badge--premium">
                <Sparkles size={12} aria-hidden />
                {pickBilingualLabel(language, "Premium", "प्रीमियम")}
              </span>
            ) : (
              <span className="sm-badge sm-badge--ghost">
                {pickBilingualLabel(language, "Free", "मुफ़्त")}
              </span>
            )}
            <span className="sm-badge sm-badge--streak">
              <Flame size={12} aria-hidden />
              {streakDays} {pickBilingualLabel(language, "day streak", "दिन स्ट्रीक")}
            </span>
          </div>
        </div>
      </div>

      {isLoggedIn ? (
        <button
          type="button"
          className="sm-profile__auth-btn sm-profile__auth-btn--outline tap-target"
          onClick={() => void signOut()}
        >
          {pickBilingualLabel(language, "Sign out", "साइन आउट")}
        </button>
      ) : (
        <div className="sm-profile__auth-row">
          <Link
            href="/login"
            className="sm-profile__auth-btn tap-target"
            onClick={() => onNavigate("/login")}
          >
            {pickBilingualLabel(language, "Login / Sign up", "लॉगिन / साइन अप")}
          </Link>
          <button
            type="button"
            className="sm-profile__auth-btn sm-profile__auth-btn--google tap-target"
            onClick={() => void signInWithGoogle()}
          >
            Google
          </button>
        </div>
      )}

      <ul className="sm-profile__quick" role="list">
        {MENU_ACCOUNT_LINKS.slice(0, 3).map((link) => (
          <li key={link.id}>
            <Link
              href={link.href}
              className="sm-profile__quick-item tap-target"
              onClick={() => onNavigate(link.href)}
            >
              {link.id === "saved" ? (
                <Bookmark size={16} strokeWidth={2} aria-hidden />
              ) : link.id === "listen" ? (
                <span aria-hidden>🎧</span>
              ) : (
                <Bell size={16} strokeWidth={2} aria-hidden />
              )}
              <span>{labelForLink(link, language)}</span>
              {link.id === "saved" && savedCount > 0 ? (
                <span className="sm-profile__count">{savedCount}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
