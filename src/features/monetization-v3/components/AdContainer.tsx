"use client";

import type { ReactNode } from "react";
import { cn } from "@/design-system/utils/cn";
import { NOSNIPPET_ATTRS } from "@/lib/monetization/seo";
import { useAdImpression } from "@/components/monetization/useAdImpression";

export type AdContainerVariant =
  | "leaderboard"
  | "rectangle"
  | "sidebar"
  | "in-feed"
  | "header-strip";

export type AdContainerProps = {
  variant: AdContainerVariant;
  /** Slot id for analytics impression tracking */
  slotId?: string;
  /** Show "Advertisement" disclosure label */
  showLabel?: boolean;
  label?: string;
  lazy?: boolean;
  className?: string;
  /** Placeholder text when empty */
  placeholder?: string;
  children?: ReactNode;
};

const VARIANT_CLASS: Record<AdContainerVariant, string> = {
  leaderboard: "mnv3-ad--leaderboard",
  rectangle: "mnv3-ad--rectangle",
  sidebar: "mnv3-ad--sidebar",
  "in-feed": "mnv3-ad--in-feed",
  "header-strip": "mnv3-ad--header-strip",
};

/**
 * JDP-020 — Polished ad placement shell.
 * Renders children (creative) or a labeled placeholder frame.
 */
export function AdContainer({
  variant,
  slotId = "home_leaderboard",
  showLabel = true,
  label = "Advertisement",
  lazy = false,
  className,
  placeholder,
  children,
}: AdContainerProps) {
  const ref = useAdImpression(slotId, "display", true);

  return (
    <div
      ref={ref}
      className={cn(
        "mnv3-ad mnv3-enter",
        VARIANT_CLASS[variant],
        className
      )}
      data-lazy={lazy ? "true" : "false"}
      role="complementary"
      aria-label={label}
      {...NOSNIPPET_ATTRS}
    >
      {showLabel ? <span className="mnv3-ad__label">{label}</span> : null}
      {children ? (
        <div className="mnv3-ad__content">{children}</div>
      ) : (
        <div className="mnv3-ad__frame">
          {placeholder ?? `${label} · ${variant}`}
        </div>
      )}
    </div>
  );
}

/** Map legacy placement slot ids to V3 container variants */
export function slotToAdVariant(slotId: string): AdContainerVariant {
  if (slotId.includes("leaderboard") || slotId.includes("footer")) {
    return "leaderboard";
  }
  if (slotId.includes("header")) return "header-strip";
  if (slotId.includes("sidebar")) return "sidebar";
  if (slotId.includes("mid_feed") || slotId.includes("in_article")) {
    return slotId.includes("in_article") ? "rectangle" : "in-feed";
  }
  return "rectangle";
}
