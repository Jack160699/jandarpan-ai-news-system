"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/cn";
import {
  ROUTE_ENTER_MS,
  ROUTE_EXIT_MS,
  prefersReducedMotion,
  supportsViewTransitions,
} from "@/lib/navigation/transition-config";
import { useNavigation } from "@/providers/NavigationProvider";

type RouteTransitionProps = {
  children: ReactNode;
};

type Phase = "idle" | "out" | "in";

/**
 * Crossfade route content inside persistent app shell — avoids hard cuts.
 * View Transitions API when supported; opacity/transform fallback otherwise.
 */
export function RouteTransition({ children }: RouteTransitionProps) {
  const pathname = usePathname();
  const { completeNavigation } = useNavigation();
  const [displayed, setDisplayed] = useState(children);
  const [phase, setPhase] = useState<Phase>("idle");
  const pathRef = useRef(pathname);
  const isFirstRender = useRef(true);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (exitTimerRef.current != null) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    if (enterTimerRef.current != null) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
  }, []);

  const finishTransition = useCallback(() => {
    setPhase("idle");
    completeNavigation();
  }, [completeNavigation]);

  /* RSC refresh on same path */
  useEffect(() => {
    if (pathRef.current === pathname) {
      setDisplayed(children);
    }
  }, [pathname, children]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      pathRef.current = pathname;
      setDisplayed(children);
      return;
    }

    if (pathname === pathRef.current) return;

    pathRef.current = pathname;
    clearTimers();

    if (prefersReducedMotion()) {
      setDisplayed(children);
      setPhase("idle");
      completeNavigation();
      return;
    }

    const applyContent = () => {
      flushSync(() => {
        setDisplayed(children);
        setPhase("in");
      });
    };

    if (supportsViewTransitions()) {
      const transition = document.startViewTransition(() => applyContent());
      transition.finished
        .then(() => finishTransition())
        .catch(() => finishTransition());
      return clearTimers;
    }

    setPhase("out");
    exitTimerRef.current = setTimeout(() => {
      applyContent();
      enterTimerRef.current = setTimeout(finishTransition, ROUTE_ENTER_MS);
    }, ROUTE_EXIT_MS);

    return clearTimers;
  }, [
    pathname,
    children,
    clearTimers,
    completeNavigation,
    finishTransition,
  ]);

  const isStory = pathname.startsWith("/story/");

  return (
    <div
      className={cn(
        "app-shell__main route-transition-host",
        phase === "out" && "route-transition-host--out",
        phase === "in" && "route-transition-host--in",
        isStory && "route-transition-host--story"
      )}
    >
      <div
        className={cn(
          "route-transition__viewport",
          phase === "out" && "route-transition__viewport--out",
          phase === "in" && "route-transition__viewport--in",
          phase === "idle" && "route-transition__viewport--idle"
        )}
      >
        {displayed}
      </div>
    </div>
  );
}
