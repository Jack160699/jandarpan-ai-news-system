"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, Globe } from "lucide-react";
import { getLanguageConfig } from "@/lib/i18n/languages";
import type { AppLanguage } from "@/lib/i18n/types";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/providers/LanguageProvider";

type HeaderLanguageSwitcherProps = {
  className?: string;
  /** Compact: icon + short code only (mobile) */
  compact?: boolean;
};

export function HeaderLanguageSwitcher({
  className = "",
  compact = false,
}: HeaderLanguageSwitcherProps) {
  const { language, setLanguage, t, languageOptions } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const cfg = getLanguageConfig(language);
  const label = languageOptions.find((o) => o.id === language)?.native ?? cfg.native;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        className={cn(
          "header-lang-switch tap-target",
          open && "header-lang-switch--open"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t.header.changeLanguage}
        onClick={() => setOpen((o) => !o)}
      >
        <Globe className="header-lang-switch__icon" strokeWidth={2} aria-hidden />
        <span className="header-lang-switch__label" style={{ fontFamily: cfg.fontFamily }}>
          {label}
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="listbox"
            aria-label={t.header.languageSheetTitle}
            className="header-lang-menu"
            initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {languageOptions.map((opt) => {
              const active = language === opt.id;
              const optCfg = getLanguageConfig(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn(
                    "header-lang-menu__item tap-target",
                    active && "header-lang-menu__item--active"
                  )}
                  style={{ fontFamily: optCfg.fontFamily }}
                  onClick={() => {
                    setLanguage(opt.id as AppLanguage);
                    close();
                  }}
                >
                  <span className="header-lang-menu__native">{opt.native}</span>
                  {active ? (
                    <Check className="h-4 w-4 shrink-0 text-red-400" strokeWidth={2.5} />
                  ) : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
