"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { useLanguage } from "@/providers/LanguageProvider";

const THRESHOLD = 72;
const MAX_PULL = 110;
/** Minimum downward pull before capturing gesture (allows normal scroll at top) */
const PULL_ARM_PX = 16;
const ENABLED_PREFIXES = ["/", "/live", "/category", "/search", "/archive"];

type PullToRefreshProps = {
  children: ReactNode;
};

function isEnabledPath(pathname: string): boolean {
  return ENABLED_PREFIXES.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(p))
  );
}

export function PullToRefresh({ children }: PullToRefreshProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const hapticReady = useRef(false);
  const pathnameRef = useRef("");

  useEffect(() => {
    pathnameRef.current = window.location.pathname;
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerHaptic("success");
    document.documentElement.setAttribute("data-ptr-refresh", "1");
    try {
      router.refresh();
      await new Promise((r) => setTimeout(r, 600));
    } finally {
      document.documentElement.removeAttribute("data-ptr-refresh");
      setRefreshing(false);
      setPull(0);
    }
  }, [router]);

  const onTouchStart = (e: TouchEvent) => {
    if (refreshing) return;
    if (!isEnabledPath(window.location.pathname)) return;
    if (window.scrollY > 4) return;
    startY.current = e.touches[0]?.clientY ?? 0;
    pulling.current = true;
    hapticReady.current = true;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const y = e.touches[0]?.clientY ?? 0;
    const delta = y - startY.current;
    if (window.scrollY > 4) {
      pulling.current = false;
      setPull(0);
      return;
    }
    if (delta <= 0) {
      setPull(0);
      return;
    }
    /* Do not block browser scroll until user clearly pulls down to refresh */
    if (delta < PULL_ARM_PX) {
      return;
    }
    e.preventDefault();
    const damped = Math.min(MAX_PULL, (delta - PULL_ARM_PX) * 0.5);
    setPull(damped);
    if (damped > THRESHOLD * 0.85 && hapticReady.current) {
      hapticReady.current = false;
      triggerHaptic("selection");
    }
  };

  const onTouchEnd = () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pull >= THRESHOLD) {
      void onRefresh();
    } else {
      setPull(0);
    }
  };

  const progress = Math.min(1, pull / THRESHOLD);
  const show = pull > 8 || refreshing;

  return (
    <div
      className="ptr-root"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        className={`ptr-indicator${show ? " ptr-indicator--visible" : ""}${refreshing ? " ptr-indicator--refreshing" : ""}`}
        style={
          {
            "--ptr-pull": `${pull}px`,
            "--ptr-progress": progress,
          } as React.CSSProperties
        }
        aria-hidden={!show}
      >
        <span className="ptr-indicator__ring">
          <span className="ptr-indicator__spinner" />
        </span>
        <span className="ptr-indicator__label">
          {refreshing
            ? t.ptr.refreshing
            : progress >= 1
              ? t.ptr.release
              : t.ptr.pull}
        </span>
      </div>
      {children}
    </div>
  );
}
