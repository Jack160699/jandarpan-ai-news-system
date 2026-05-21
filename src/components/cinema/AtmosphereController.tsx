"use client";

import { useAtmosphere } from "@/hooks/useAtmosphere";

export function AtmosphereController() {
  useAtmosphere();
  return <div className="atmosphere-veil" aria-hidden />;
}
