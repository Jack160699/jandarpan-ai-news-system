"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { NOSNIPPET_ATTRS } from "@/lib/monetization/seo";
import { useAdImpression } from "@/components/monetization/useAdImpression";

type NativeAdShellProps = {
  slotId: string;
  size: "300x250" | "336x280" | "full-width";
  label?: string;
  sublabel?: string;
  children: ReactNode;
  className?: string;
};

export function NativeAdShell({
  slotId,
  size,
  label = "Sponsored",
  sublabel,
  children,
  className = "",
}: NativeAdShellProps) {
  const reduceMotion = useReducedMotion();
  const ref = useAdImpression(slotId, "display", true);

  return (
    <motion.aside
      ref={ref}
      className={`native-ad native-ad--${size.replace("x", "-")} ${className}`.trim()}
      role="complementary"
      aria-label={label}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      {...NOSNIPPET_ATTRS}
    >
      <div className="native-ad__glow" aria-hidden />
      <header className="native-ad__header">
        <span className="native-ad__badge">{label}</span>
        {sublabel ? (
          <span className="native-ad__sublabel">{sublabel}</span>
        ) : null}
      </header>
      <div className="native-ad__body">{children}</div>
    </motion.aside>
  );
}
