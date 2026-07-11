"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { APP_STICKY_STACK_ID, HOME_STACK_SLOT_ID } from "@/lib/layout/stack-heights";

type HomepageStackPortalProps = {
  children: React.ReactNode;
  hasTicker?: boolean;
};

/**
 * Mounts homepage chrome bands into the unified sticky stack slot in AppLayout.
 * Must render inside LiveNewsroomProvider when bands need live context.
 */
export function HomepageStackPortal({
  children,
  hasTicker = true,
}: HomepageStackPortalProps) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById(HOME_STACK_SLOT_ID));
  }, []);

  useEffect(() => {
    const stack = document.getElementById(APP_STICKY_STACK_ID);
    if (!stack) return;
    stack.setAttribute("data-has-ticker", hasTicker ? "true" : "false");
    return () => stack.removeAttribute("data-has-ticker");
  }, [hasTicker]);

  if (slot) {
    return createPortal(children, slot);
  }

  /** SSR + pre-portal paint — keeps breaking/trending markup in crawlable HTML */
  return <div className="homepage-stack-inline">{children}</div>;
}
