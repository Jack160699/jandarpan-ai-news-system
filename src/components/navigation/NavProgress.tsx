"use client";

import { useNavigation } from "@/providers/NavigationProvider";

export function NavProgress() {
  const { isNavigating } = useNavigation();

  return (
    <div
      className={`nav-progress${isNavigating ? " nav-progress--active" : ""}`}
      role="progressbar"
      aria-hidden={!isNavigating}
      aria-valuemin={0}
      aria-valuemax={100}
    />
  );
}
