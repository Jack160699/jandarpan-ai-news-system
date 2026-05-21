"use client";

import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import { getEditionLineage } from "@/lib/institution";
import { formatEditionTimestamp } from "@/lib/live-edition";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const SESSION_KEY = "chronicle-edition-opened";

function todayKey() {
  return new Date().toDateString();
}

export function EditionOpening() {
  const [visible, setVisible] = useState(false);
  const [complete, setComplete] = useState(true);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const seen = sessionStorage.getItem(SESSION_KEY);
    if (seen === todayKey()) return;

    setComplete(false);
    setVisible(true);

    const fadeTimer = window.setTimeout(() => setVisible(false), 2200);
    const doneTimer = window.setTimeout(() => {
      setComplete(true);
      sessionStorage.setItem(SESSION_KEY, todayKey());
    }, 3400);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [reduced]);

  if (reduced || complete) return null;

  return (
    <div
      className={`edition-opening ${!visible ? "is-complete" : ""}`}
      aria-hidden={!visible}
      role="presentation"
    >
      <div
        className="edition-opening__content"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 1.2s ease" }}
      >
        <p className="archive-marker">संस्करण · Edition arriving</p>
        <p className="mt-6 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--brand-maroon-deep,#5c1212)] md:text-4xl">
          {BRAND.nameEn}
        </p>
        <p
          className="mt-2 text-xl text-[var(--ink-muted)]"
          style={{ fontFamily: "var(--font-hindi)" }}
        >
          {BRAND.nameHi}
        </p>
        <p className="meta-label mt-6 text-[var(--ink-muted)]">
          {formatEditionTimestamp()}
        </p>
        <p className="meta-label mt-3 text-[var(--ink-faint)]">
          {getEditionLineage()}
        </p>
      </div>
    </div>
  );
}
