"use client";

import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { LegalPolicyContent } from "@/components/legal/LegalPolicyContent";
import { getPolicy, type PolicySlug } from "@/lib/legal/policies";
import { cn } from "@/lib/cn";

type LanguageGatePolicySheetProps = {
  slug: PolicySlug | null;
  onClose: () => void;
};

export function LanguageGatePolicySheet({
  slug,
  onClose,
}: LanguageGatePolicySheetProps) {
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const doc = slug ? getPolicy(slug) : null;
  const open = Boolean(doc);

  const onEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onEscape);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = prev;
    };
  }, [open, onEscape]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [open, slug]);

  return (
    <AnimatePresence>
      {open && doc ? (
        <div
          className="lang-gate-policy"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lang-gate-policy-title"
        >
          <motion.button
            type="button"
            className="lang-gate-policy__backdrop"
            aria-label="Close policy"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />

          <motion.div
            className={cn(
              "lang-gate-policy__panel",
              "rounded-t-[1.75rem] sm:rounded-3xl"
            )}
            initial={
              reduceMotion ? false : { opacity: 0, y: "100%", scale: 0.98 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: "100%", scale: 0.98 }
            }
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lang-gate-policy__handle" aria-hidden>
              <span className="lang-gate-policy__handle-bar" />
            </div>

            <header className="lang-gate-policy__header">
              <div className="lang-gate-policy__header-text">
                <p className="lang-gate-policy__brand">Jan Darpan</p>
                <h2
                  id="lang-gate-policy-title"
                  className="lang-gate-policy__title"
                >
                  {doc.titleEn}
                </h2>
                <p className="lang-gate-policy__updated">
                  Last updated {doc.updated}
                </p>
              </div>
              <button
                type="button"
                className="lang-gate-policy__close tap-target"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </header>

            <div className="lang-gate-policy__scroll-hint" aria-hidden>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              <span>Scroll to read</span>
            </div>

            <div
              ref={scrollRef}
              className="lang-gate-policy__body"
              tabIndex={0}
            >
              <LegalPolicyContent doc={doc} variant="gate" />
            </div>

            <footer className="lang-gate-policy__footer">
              <motion.button
                type="button"
                className="lang-gate-policy__primary tap-target"
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                onClick={onClose}
              >
                Close
              </motion.button>
            </footer>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
