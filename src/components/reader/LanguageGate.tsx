"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { LanguageGateBackground } from "@/components/reader/LanguageGateBackground";
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
import { isGateLanguage } from "@/lib/i18n/gate-languages";
import { getLanguageConfig } from "@/lib/i18n/languages";
import { loadStoredLanguage } from "@/lib/i18n/storage";
import type { AppLanguage } from "@/lib/i18n/types";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTenant } from "@/providers/TenantProvider";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const POLICY_LINKS = [
  { href: "/terms", key: "terms" as const },
  { href: "/privacy", key: "privacy" as const },
  { href: "/cookies", key: "cookies" as const },
  { href: "/ads-policy", key: "ads" as const },
];

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
    if (!ready) return "cg" as AppLanguage;
    const stored = loadStoredLanguage();
    if (stored.chosen && isGateLanguage(stored.language)) {
      return stored.language;
    }
    const detected = detectBrowserLanguage();
    if (isGateLanguage(detected)) return detected;
    return resolveGateHighlightLanguage(null);
  }, [ready, language, showLanguageGate]);

  const [selected, setSelected] = useState<AppLanguage>(initialSelection);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [visible, setVisible] = useState(false);

  const canContinue = legalAccepted;

  useEffect(() => {
    if (showLanguageGate) {
      setSelected(initialSelection);
      setLegalAccepted(false);
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
    }, 200);
    return () => {
      document.removeEventListener("keydown", trapFocus);
      window.clearTimeout(t);
    };
  }, [showLanguageGate, trapFocus]);

  if (!ready || !showLanguageGate) return null;

  return (
    <div
      className={cn("lang-gate", visible && "lang-gate--visible")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-gate-title"
      lang={gateUiLocale}
      dir="ltr"
    >
      <LanguageGateBackground />

      <div className="relative z-[1] flex h-full min-h-0 w-full items-center justify-center px-3 py-3 sm:px-4">
        <motion.div
          ref={panelRef}
          className={cn(
            "relative w-full max-w-[22rem] shrink-0",
            "rounded-[1.35rem] border border-white/10",
            "bg-white/[0.07] shadow-[0_32px_64px_rgba(0,0,0,0.55),0_0_48px_rgba(196,30,58,0.12)]",
            "backdrop-blur-xl backdrop-saturate-150",
            "ring-1 ring-inset ring-white/[0.08]",
            "max-h-[min(96dvh,40rem)] overflow-y-auto overscroll-contain",
            "px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5 sm:pt-4"
          )}
          initial={reduceMotion ? false : { opacity: 0, y: 32, scale: 0.96 }}
          animate={
            visible
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 0, y: 32, scale: 0.96 }
          }
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-3 flex justify-center">
            <TenantLogo
              variant="banner"
              showText={false}
              className="lang-gate__logo h-9 max-w-[8.5rem] sm:h-10"
            />
          </div>

          <p className="m-0 text-center font-[family-name:var(--font-ui)] text-[10px] font-bold uppercase tracking-[0.14em] text-red-200/80">
            {copy.welcome}
          </p>
          <h2
            id="lang-gate-title"
            className="m-0 mt-1.5 text-center font-[family-name:var(--font-display)] text-[clamp(1.35rem,5.5vw,1.65rem)] font-bold leading-[1.15] tracking-tight text-white drop-shadow-[0_0_28px_rgba(196,30,58,0.35)]"
          >
            {copy.title}
          </h2>
          <p className="m-0 mt-1.5 text-center font-[family-name:var(--font-ui)] text-[13px] font-medium leading-snug text-white/55">
            {copy.subtitle}
          </p>

          <div
            className="mt-3.5 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-2.5"
            role="listbox"
            aria-label={copy.title}
          >
            {gateLanguageOptions.map((opt, index) => {
              const cfg = getLanguageConfig(opt.id);
              const isSelected = selected === opt.id;
              return (
                <motion.button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: reduceMotion ? 0 : 0.04 * index,
                    duration: 0.32,
                  }}
                  whileHover={reduceMotion || isSelected ? undefined : { scale: 1.03 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                  className={cn(
                    "tap-target relative flex min-h-[3rem] items-center justify-center rounded-2xl px-2 py-2.5",
                    "border text-center transition-shadow duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50",
                    isSelected
                      ? "border-red-400/70 bg-gradient-to-br from-red-600/35 via-red-900/25 to-black/40 shadow-[0_0_0_1px_rgba(255,80,80,0.25),0_8px_24px_rgba(196,30,58,0.35)]"
                      : "border-white/10 bg-white/[0.06] shadow-none hover:border-red-400/35 hover:bg-white/[0.1]"
                  )}
                  style={{ fontFamily: cfg.fontFamily }}
                  onClick={() => setSelected(opt.id as AppLanguage)}
                >
                  {isSelected && !reduceMotion ? (
                    <span
                      className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-red-400/40"
                      aria-hidden
                    >
                      <span className="lang-gate-card-pulse absolute inset-0 rounded-2xl" />
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "relative z-[1] text-[1.02rem] font-semibold leading-tight",
                      isSelected ? "text-white" : "text-white/88"
                    )}
                  >
                    {opt.native}
                  </span>
                  {isSelected ? (
                    <motion.span
                      className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#b30000] shadow-md"
                      initial={reduceMotion ? false : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 520,
                        damping: 28,
                      }}
                      aria-hidden
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </motion.span>
                  ) : null}
                </motion.button>
              );
            })}
          </div>

          <label className="mt-3.5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/[0.08] bg-black/20 px-2.5 py-2.5 sm:mt-4">
            <input
              type="checkbox"
              className="lang-gate__checkbox mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-white/30 accent-[#e11d2e]"
              checked={legalAccepted}
              onChange={(e) => setLegalAccepted(e.target.checked)}
              aria-describedby="lang-gate-legal-disclaimer"
            />
            <span className="min-w-0 font-[family-name:var(--font-ui)] text-[11px] leading-snug text-white/75">
              <span>{copy.legal.agreeIntro} </span>
              {POLICY_LINKS.map((link, i) => (
                <span key={link.href}>
                  {i > 0 && i < POLICY_LINKS.length - 1 ? ", " : null}
                  {i === POLICY_LINKS.length - 1 && i > 0 ? " and " : null}
                  <Link
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-red-300 underline decoration-red-400/40 underline-offset-2 hover:text-red-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {copy.legal[link.key]}
                  </Link>
                </span>
              ))}
              <span>.</span>
            </span>
          </label>

          <p
            id="lang-gate-legal-disclaimer"
            className="m-0 mt-2 text-center font-[family-name:var(--font-ui)] text-[10px] leading-snug text-white/40"
          >
            {copy.legal.disclaimer}
          </p>

          <div className="relative mt-3">
            {!reduceMotion && canContinue ? (
              <span
                className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r from-red-600/50 via-red-500/30 to-red-800/50 opacity-80 blur-md"
                aria-hidden
              />
            ) : null}
            <motion.button
              type="button"
              disabled={!canContinue}
              className={cn(
                "tap-target relative z-[1] w-full min-h-[3rem] rounded-2xl font-[family-name:var(--font-ui)] text-[15px] font-bold tracking-wide",
                "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                canContinue
                  ? "bg-gradient-to-b from-[#ff2a2a] to-[#a80000] text-white shadow-[0_8px_28px_rgba(196,30,58,0.45),inset_0_1px_0_rgba(255,255,255,0.25)]"
                  : "cursor-not-allowed bg-stone-600/50 text-white/40 shadow-none"
              )}
              whileTap={canContinue && !reduceMotion ? { scale: 0.98 } : undefined}
              onClick={() => canContinue && confirmLanguage(selected)}
            >
              {copy.confirm}
            </motion.button>
          </div>

          <p className="m-0 mt-2 text-center font-[family-name:var(--font-ui)] text-[10px] text-white/35">
            {copy.hint}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
