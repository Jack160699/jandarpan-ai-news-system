"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { useLanguage } from "@/providers/LanguageProvider";

export function AppFab() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const scrollTop = useCallback(() => {
    triggerHaptic("light");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const isStory = pathname.startsWith("/story/");
  const isListen = pathname === "/listen";
  const hideOnShorts = pathname.startsWith("/shorts");

  if (hideOnShorts || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="app-fab-stack md:hidden" aria-label="Quick actions">
      {showTop ? (
        <button
          type="button"
          className="app-fab app-fab--secondary tap-press"
          onClick={scrollTop}
          aria-label={t.fab.scrollTop}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 5v14M5 12l7-7 7 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}

      {!isListen && !isStory ? (
        <Link
          href="/listen"
          className="app-fab app-fab--listen tap-press"
          aria-label={t.fab.listen}
          onClick={() => triggerHaptic("selection")}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M11 5L6 9H3v6h3l5 4V5zm4.5 2.5a5 5 0 010 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      ) : null}

      {pathname === "/" ? (
        <Link
          href="/live"
          className="app-fab app-fab--live tap-press"
          aria-label={t.fab.live}
          onClick={() => triggerHaptic("medium")}
        >
          <span className="app-fab__live-dot" aria-hidden />
          <span className="app-fab__live-text">{t.common.live}</span>
        </Link>
      ) : null}
    </div>
  );
}
