"use client";

import { useEffect, useState, type RefObject } from "react";

const ITEM_HEIGHT = 132;
const OVERSCAN = 4;
export const THREAD_VIRTUAL_THRESHOLD = 20;

type VirtualRange = {
  start: number;
  end: number;
  offsetTop: number;
  totalHeight: number;
  virtualized: boolean;
};

export function useThreadVirtualList(
  count: number,
  containerRef: RefObject<HTMLElement | null>
): VirtualRange {
  const [range, setRange] = useState({ start: 0, end: count });

  useEffect(() => {
    if (count <= THREAD_VIRTUAL_THRESHOLD) {
      setRange({ start: 0, end: count });
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const scrollTop = el.scrollTop;
      const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
      const visible = Math.ceil(el.clientHeight / ITEM_HEIGHT) + OVERSCAN * 2;
      const end = Math.min(count, start + visible);
      setRange({ start, end });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [count, containerRef]);

  const virtualized = count > THREAD_VIRTUAL_THRESHOLD;

  return {
    start: virtualized ? range.start : 0,
    end: virtualized ? range.end : count,
    offsetTop: virtualized ? range.start * ITEM_HEIGHT : 0,
    totalHeight: count * ITEM_HEIGHT,
    virtualized,
  };
}
