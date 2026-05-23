"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useNavigation } from "@/providers/NavigationProvider";

type RouteTransitionProps = {
  children: React.ReactNode;
};

/** App-like enter + subtle loading state during navigation */
export function RouteTransition({ children }: RouteTransitionProps) {
  const { isNavigating } = useNavigation();
  const pathname = usePathname();
  const [enter, setEnter] = useState(true);

  useEffect(() => {
    setEnter(true);
    const t = window.setTimeout(() => setEnter(false), 360);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <div
      key={pathname}
      className={`route-transition${isNavigating ? " route-transition--loading" : ""}${enter ? " route-transition--enter" : ""}`}
    >
      {children}
    </div>
  );
}
