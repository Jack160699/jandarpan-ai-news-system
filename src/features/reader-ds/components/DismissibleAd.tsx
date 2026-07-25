"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  readStickyAdDismissed,
  shouldMountStickyAd,
  writeStickyAdDismissed,
} from "../ads/ad-display";
import { Ad } from "./Ad";

/**
 * Dismissible ad unit. Sticky mounts only with a creative or in preview mode.
 * Close persists in sessionStorage so it does not reappear on reload.
 */
export function DismissibleAd({
  label,
  size,
  height,
  sticky = false,
  children,
  forcePreview,
  reserveWhenEmpty = false,
}: {
  label?: string;
  size?: string;
  height?: number;
  sticky?: boolean;
  children?: ReactNode;
  forcePreview?: boolean;
  reserveWhenEmpty?: boolean;
}) {
  const hasCreative = Boolean(children);
  const [open, setOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (sticky && readStickyAdDismissed()) setOpen(false);
  }, [sticky]);

  if (!open) return null;

  if (sticky) {
    // Avoid flash of sticky chrome before session dismiss is read.
    if (!hydrated) return null;
    if (
      !shouldMountStickyAd({
        hasCreative,
        dismissed: false,
        forcePreview,
      })
    ) {
      return null;
    }

    const showPreviewChrome = !hasCreative;

    return (
      <div
        className="jd-sticky-ad"
        role="complementary"
        aria-label="विज्ञापन"
        data-testid="jd-sticky-ad"
        data-jd-ad-mode={hasCreative ? "creative" : "preview"}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: "calc(56px + env(safe-area-inset-bottom, 0px))",
          zIndex: 48,
          background: "var(--jd-paper-2)",
          borderTop: "1px solid var(--jd-line)",
          padding: "6px 10px",
          /* Reserve sticky height to limit CLS when mounted */
          minHeight: 56,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 2,
          }}
        >
          <span
            className="jd-ui"
            style={{
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: ".12em",
              color: "var(--jd-muted)",
              textTransform: "uppercase",
            }}
          >
            विज्ञापन
          </span>
          <button
            type="button"
            aria-label="विज्ञापन बंद करें"
            data-testid="jd-sticky-ad-close"
            onClick={() => {
              writeStickyAdDismissed(true);
              setOpen(false);
            }}
            className="jd-ui"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--jd-ink-3)",
              fontSize: 14,
              minWidth: 32,
              minHeight: 32,
            }}
          >
            ×
          </button>
        </div>
        {hasCreative ? (
          children
        ) : showPreviewChrome ? (
          <div
            className="jd-ui"
            style={{
              height: 44,
              borderRadius: 2,
              border: "1px dashed var(--jd-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: "var(--jd-muted)",
            }}
          >
            {label ?? "स्टिकी बैनर · 320×50"}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      onClickCapture={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest('[aria-label="बंद करें"]')) {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <Ad
        label={label}
        size={size}
        height={height}
        close
        reserveWhenEmpty={reserveWhenEmpty}
        forcePreview={forcePreview}
      >
        {children}
      </Ad>
    </div>
  );
}
