"use client";

import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";

type ReelChromeProps = {
  total: number;
  activeIndex: number;
  hidden?: boolean;
};

export function ReelChrome({ total, activeIndex, hidden }: ReelChromeProps) {
  const { t } = useLanguage();

  return (
    <header
      className={`reels-page__chrome reels-chrome${hidden ? " reels-chrome--hidden" : ""}`}
    >
      <Link href="/" className="reels-chrome__back tap-target">
        ← {t.shorts.backHome}
      </Link>
      <div className="reels-chrome__center">
        <span className="reels-chrome__brand">{t.shorts.title}</span>
        <span className="reels-chrome__sub">{t.shorts.subtitle}</span>
      </div>
      <span className="reels-chrome__position" aria-live="polite">
        {activeIndex + 1}/{total}
      </span>
    </header>
  );
}
