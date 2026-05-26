"use client";

import { useEffect, useState } from "react";

/** True only after the first client commit — use before any time/random render output. */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
