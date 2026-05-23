"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";

const HINT_KEY = "nr-reels-hint-seen";

export function ReelSwipeHint() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(HINT_KEY) === "1") return;
      setVisible(true);
      const id = window.setTimeout(() => {
        setVisible(false);
        sessionStorage.setItem(HINT_KEY, "1");
      }, 3200);
      return () => clearTimeout(id);
    } catch {
      /* private mode */
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="reel-swipe-hint" role="status" aria-live="polite">
      <span className="reel-swipe-hint__icon" aria-hidden>
        ↑
      </span>
      <span>{t.shorts.swipeHint}</span>
    </div>
  );
}
