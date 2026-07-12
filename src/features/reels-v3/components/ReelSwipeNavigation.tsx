"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMotionConfig } from "@/design-system/motion";
import { useLanguage } from "@/providers/LanguageProvider";

type ReelSwipeNavigationProps = {
  visible?: boolean;
};

/**
 * JDP-017 — Swipe hint overlay for first-time orientation
 */
export function ReelSwipeNavigation({ visible = true }: ReelSwipeNavigationProps) {
  const { t } = useLanguage();
  const { reduced, transition } = useMotionConfig();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => setDismissed(true), 3200);
    return () => clearTimeout(id);
  }, [visible]);

  const show = visible && !dismissed;

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="reels-v3-swipe-hint"
          role="status"
          aria-live="polite"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -4 }}
          transition={transition("normal")}
        >
          <motion.span
            className="reels-v3-swipe-hint__icon"
            aria-hidden
            animate={reduced ? undefined : { y: [0, -6, 0] }}
            transition={{
              ...transition("normal"),
              repeat: reduced ? 0 : Infinity,
              repeatDelay: 0.4,
            }}
          >
            <ChevronUp size={20} strokeWidth={2.5} />
          </motion.span>
          <span>{t.shorts.swipeHint}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
