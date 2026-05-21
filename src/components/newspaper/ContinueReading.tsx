"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { DURATION, EASE } from "@/animations/easing";
import { cn } from "@/lib/cn";

type ContinueReadingProps = {
  href: string;
  label?: string;
  hint?: string;
  className?: string;
  onExpand?: () => void;
};

const contentClass =
  "flex w-full flex-col gap-3 border-t border-[var(--rule)] pt-6 text-left transition-colors duration-700 hover:border-[var(--rule-strong)] md:max-w-xs";

function ContinueContent({
  label,
  hint,
}: {
  label: string;
  hint?: string;
}) {
  return (
    <>
      {hint ? (
        <span className="meta-label text-[var(--ink-muted)]">{hint}</span>
      ) : null}
      <span className="flex items-center justify-between gap-4">
        <span className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--ink-primary)] md:text-xl">
          {label}
        </span>
        <motion.span
          className="meta-label text-[var(--ink-primary)]"
          aria-hidden
          initial={{ x: 0 }}
          whileHover={{ x: 6 }}
          transition={{ duration: 0.6, ease: EASE.paper }}
        >
          →
        </motion.span>
      </span>
      <span className="h-px w-0 bg-[var(--ink-primary)] transition-all duration-700 group-hover:w-full" />
    </>
  );
}

export function ContinueReading({
  href,
  label = "Continue reading",
  hint = "The story unfolds below",
  className,
  onExpand,
}: ContinueReadingProps) {
  return (
    <motion.div
      className={cn("group continue-reading", className)}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-5%" }}
      transition={{ duration: DURATION.slow, ease: EASE.editorial, delay: 0.5 }}
    >
      {onExpand ? (
        <button type="button" onClick={onExpand} className={contentClass}>
          <ContinueContent label={label} hint={hint} />
        </button>
      ) : (
        <Link href={href} className={contentClass}>
          <ContinueContent label={label} hint={hint} />
        </Link>
      )}
    </motion.div>
  );
}
