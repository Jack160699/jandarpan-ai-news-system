"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type UseModalA11yOptions = {
  open: boolean;
  onClose: () => void;
  panelRef: RefObject<HTMLElement | null>;
  /** Comma-separated selectors for page regions to inert while open */
  inertSelector?: string;
  restoreFocus?: boolean;
  lockScroll?: boolean;
  initialFocusSelector?: string;
};

/**
 * Shared modal accessibility: focus trap, Escape, scroll lock, inert backdrop content, focus restore.
 */
export function useModalA11y({
  open,
  onClose,
  panelRef,
  inertSelector = ".app-shell__content, .jdp-shell__feed, .home-page",
  restoreFocus = true,
  lockScroll = true,
  initialFocusSelector,
}: UseModalA11yOptions) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const inertedRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    if (!open) return;

    if (restoreFocus) {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }

    const inertTargets = inertSelector
      .split(",")
      .map((selector) => document.querySelector<HTMLElement>(selector.trim()))
      .filter((el): el is HTMLElement => Boolean(el));
    inertedRef.current = inertTargets;
    for (const el of inertTargets) el.inert = true;

    const prevOverflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
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
    };

    document.addEventListener("keydown", onKeyDown);
    const focusTimer = window.setTimeout(() => {
      if (!panelRef.current) return;
      const target = initialFocusSelector
        ? panelRef.current.querySelector<HTMLElement>(initialFocusSelector)
        : panelRef.current.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    }, 50);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
      if (lockScroll) document.body.style.overflow = prevOverflow;
      for (const el of inertedRef.current) el.inert = false;
      inertedRef.current = [];
      if (restoreFocus) triggerRef.current?.focus?.();
    };
  }, [
    open,
    onClose,
    panelRef,
    inertSelector,
    restoreFocus,
    lockScroll,
    initialFocusSelector,
  ]);
}
