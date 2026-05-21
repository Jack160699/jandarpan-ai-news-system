"use client";

import { motion } from "framer-motion";
import { DURATION, EASE } from "@/animations/easing";
import { cn } from "@/lib/cn";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";

type IncompleteRevealProps = {
  children: React.ReactNode;
  className?: string;
  /** 0–1 — how much remains visually “unread” before full reveal */
  initialClip?: number;
  delay?: number;
};

export function IncompleteReveal({
  children,
  className,
  initialClip = 0.35,
  delay = 0.15,
}: IncompleteRevealProps) {
  const ctx = useEditorialIntelligenceOptional();
  const duration =
    DURATION.cinematic * (ctx?.pacing.pauseMultiplier ?? 1);
  const revealDelay = delay * (ctx?.pacing.pauseMultiplier ?? 1);

  return (
    <motion.div
      className={cn("overflow-hidden", className)}
      initial={{
        opacity: 0.72,
        clipPath: `inset(0 0 ${initialClip * 100}% 0)`,
      }}
      whileInView={{
        opacity: 1,
        clipPath: "inset(0 0 0% 0)",
      }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{
        duration,
        ease: EASE.paper,
        delay: revealDelay,
      }}
    >
      {children}
    </motion.div>
  );
}
