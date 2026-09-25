"use client";

import Link from "next/link";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useJdDsT } from "../i18n";
import { JdIcon } from "./icons";

const AVATAR_SIZE = 24;

/**
 * Profile / More control — opens the real account hub (`/archive`).
 * Logged-in users may show Google/profile avatar; guests get a neutral account icon.
 * Fixed 44×44 hit target; avatar box is always AVATAR_SIZE to avoid CLS while auth hydrates.
 */
export function MastheadProfileButton() {
  const { t } = useJdDsT();
  const { isLoggedIn, avatarUrl, avatarInitial, mounted, loading } = useReaderAccount();

  const showAvatar = mounted && !loading && isLoggedIn && Boolean(avatarUrl);
  const showInitial = mounted && !loading && isLoggedIn && !avatarUrl;

  return (
    <Link
      href="/archive"
      prefetch={false}
      aria-label={t("masthead.profileAria")}
      title={t("masthead.profileAria")}
      data-testid="jd-masthead-profile"
      className="jd-masthead__action jd-masthead__profile-btn"
      style={{
        display: "inline-flex",
        minWidth: 32,
        minHeight: 28,
        width: 32,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        textDecoration: "none",
        background: "rgba(255, 255, 255, 0.1)",
        border: "1px solid rgba(255, 255, 255, 0.25)",
        borderRadius: 3,
        color: "#ffffff",
      }}
    >
      <span
        aria-hidden
        data-testid={showAvatar ? "jd-masthead-avatar" : "jd-masthead-avatar-fallback"}
        style={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          borderRadius: AVATAR_SIZE,
          overflow: "hidden",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: showAvatar || showInitial ? "var(--jd-paper)" : "transparent",
          color: "var(--jd-gold-soft)",
        }}
      >
        {showAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl!}
            alt=""
            width={AVATAR_SIZE}
            height={AVATAR_SIZE}
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : showInitial ? (
          <span
            className="jd-ui"
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "var(--jd-navy)",
              lineHeight: 1,
            }}
          >
            {avatarInitial}
          </span>
        ) : (
          <JdIcon name="user" size={21} stroke={1.9} color="var(--jd-gold-soft)" />
        )}
      </span>
    </Link>
  );
}
