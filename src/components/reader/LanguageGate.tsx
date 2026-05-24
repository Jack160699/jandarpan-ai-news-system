"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { TenantLogo } from "@/components/tenant/TenantLogo";
import {
  detectBrowserLanguage,
  resolveGateHighlightLanguage,
} from "@/lib/i18n/browser-language";
import {
  gateCopyLocaleFromLanguage,
  getGateCopy,
  type GateCopyLocale,
} from "@/lib/i18n/gate-copy";
import { getLanguageConfig } from "@/lib/i18n/languages";
import { loadStoredLanguage } from "@/lib/i18n/storage";
import type { AppLanguage } from "@/lib/i18n/types";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTenant } from "@/providers/TenantProvider";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function LanguageGate() {
  const { tenant } = useTenant();
  const {
    showLanguageGate,
    language,
    confirmLanguage,
    gateLanguageOptions,
    ready,
  } = useLanguage();
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  const gateUiLocale: GateCopyLocale = useMemo(() => {
    if (typeof navigator === "undefined") return "en";
    return gateCopyLocaleFromLanguage(detectBrowserLanguage());
  }, [showLanguageGate]);

  const copy = useMemo(() => getGateCopy(gateUiLocale), [gateUiLocale]);

  const initialSelection = useMemo(() => {
    if (!ready) return language;
    const stored = loadStoredLanguage();
    return resolveGateHighlightLanguage(
      stored.chosen ? stored.language : null
    );
  }, [ready, language, showLanguageGate]);

  const [selected, setSelected] = useState<AppLanguage>(initialSelection);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (showLanguageGate) {
      setSelected(initialSelection);
      document.body.style.overflow = "hidden";
      const id = requestAnimationFrame(() => setVisible(true));
      return () => {
        cancelAnimationFrame(id);
        document.body.style.overflow = "";
      };
    }
    setVisible(false);
    document.body.style.overflow = "";
  }, [showLanguageGate, initialSelection]);

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const nodes = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    if (!showLanguageGate) return;
    document.addEventListener("keydown", trapFocus);
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 120);
    return () => {
      document.removeEventListener("keydown", trapFocus);
      window.clearTimeout(t);
    };
  }, [showLanguageGate, trapFocus]);

  if (!ready || !showLanguageGate) return null;

  const brandName = tenant.branding.nameEn;

  return (
    <div
      className={cn(
        "lang-gate",
        visible && "lang-gate--visible"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-gate-title"
      lang={gateUiLocale === "ur" ? "ur" : gateUiLocale}
      dir={gateUiLocale === "ur" ? "rtl" : "ltr"}
    >
      <div className="lang-gate__backdrop" aria-hidden />

      <motion.div
        ref={panelRef}
        className="lang-gate__panel"
        initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.97 }}
        animate={
          visible
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: 28, scale: 0.97 }
        }
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="lang-gate__brand">
          <TenantLogo
            variant="banner"
            showText={false}
            className="lang-gate__logo"
          />
        </div>

        <p className="lang-gate__welcome">{copy.welcome}</p>
        <h2 id="lang-gate-title" className="lang-gate__title">
          {copy.title}
        </h2>
        <p className="lang-gate__subtitle">{copy.subtitle}</p>

        <div
          className="lang-gate__grid"
          role="listbox"
          aria-label={copy.title}
        >
          {gateLanguageOptions.map((opt) => {
            const cfg = getLanguageConfig(opt.id);
            const isSelected = selected === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "lang-gate__card tap-target",
                  isSelected && "lang-gate__card--active"
                )}
                style={{ fontFamily: cfg.fontFamily }}
                onClick={() => setSelected(opt.id as AppLanguage)}
              >
                <span className="lang-gate__card-label">{opt.native}</span>
                {isSelected ? (
                  <motion.span
                    className="lang-gate__check"
                    initial={reduceMotion ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 520, damping: 28 }}
                    aria-hidden
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </motion.span>
                ) : null}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="lang-gate__continue tap-target"
          onClick={() => confirmLanguage(selected)}
        >
          {copy.confirm}
        </button>

        <p className="lang-gate__hint">{copy.hint}</p>
        <p className="lang-gate__edition">
          {brandName}
        </p>
      </motion.div>
    </div>
  );
}
