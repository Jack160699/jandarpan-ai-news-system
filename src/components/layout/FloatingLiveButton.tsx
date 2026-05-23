"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { useLanguage } from "@/providers/LanguageProvider";

/** Mobile FAB for quick live desk access (homepage) */
export function FloatingLiveButton() {
  const pathname = usePathname();
  const { t } = useLanguage();

  if (pathname !== "/") {
    return null;
  }

  return (
    <Link
      href="/live"
      className="floating-live-btn pl-hide-desktop"
      aria-label={t.nav.live}
      onClick={() => triggerHaptic("medium")}
    >
      <span className="floating-live-btn__dot" aria-hidden />
      {t.common.live}
    </Link>
  );
}
