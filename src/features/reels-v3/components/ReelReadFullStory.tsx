"use client";

import Link from "next/link";
import { Newspaper } from "lucide-react";
import { focusRingClass } from "@/design-system/utils/aria";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/providers/LanguageProvider";

type ReelReadFullStoryProps = {
  slug: string;
  variant?: "action" | "cta";
  className?: string;
};

/**
 * JDP-017 — Deep link to full article
 */
export function ReelReadFullStory({
  slug,
  variant = "action",
  className,
}: ReelReadFullStoryProps) {
  const { t } = useLanguage();
  const href = `/story/${slug}`;

  if (variant === "cta") {
    return (
      <Link
        href={href}
        className={cn("reels-v3-read-cta tap-target", focusRingClass, className)}
        aria-label={t.shorts.readFull}
      >
        <span>{t.shorts.readFull}</span>
        <span className="reels-v3-read-cta__arrow" aria-hidden>
          →
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn("reels-v3-action tap-target", focusRingClass, className)}
      aria-label={t.shorts.readFull}
    >
      <span className="reels-v3-action__icon" aria-hidden>
        <Newspaper size={22} strokeWidth={2} />
      </span>
    </Link>
  );
}
