"use client";

import { useCallback, useEffect, useState } from "react";

export type SearchKeyboardMode = "wrap" | "clamp";

export type UseSearchKeyboardOptions = {
  itemCount: number;
  enabled?: boolean;
  onSelect?: (index: number) => void;
  onEscape?: () => void;
  listId?: string;
  /** wrap: cycle at ends (V3 results). clamp: stop at ends (command palette). */
  mode?: SearchKeyboardMode;
  /** Default highlight index when list updates (clamp surfaces use 0). */
  initialActiveIndex?: number;
};

export type UseSearchKeyboardReturn = {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  getOptionId: (index: number) => string;
  activeDescendantId: string | undefined;
  resetActiveIndex: () => void;
};

export function useSearchKeyboard({
  itemCount,
  enabled = true,
  onSelect,
  onEscape,
  listId = "search-v3-results",
  mode = "wrap",
  initialActiveIndex,
}: UseSearchKeyboardOptions): UseSearchKeyboardReturn {
  const defaultIndex = initialActiveIndex ?? (mode === "clamp" ? 0 : -1);
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  const getOptionId = useCallback(
    (index: number) => `${listId}-option-${index}`,
    [listId]
  );

  const activeDescendantId =
    activeIndex >= 0 && activeIndex < itemCount
      ? getOptionId(activeIndex)
      : undefined;

  const resetActiveIndex = useCallback(
    () => setActiveIndex(defaultIndex),
    [defaultIndex]
  );

  useEffect(() => {
    if (!enabled || itemCount === 0) {
      setActiveIndex(-1);
      return;
    }
    if (activeIndex >= itemCount) {
      setActiveIndex(mode === "clamp" ? itemCount - 1 : -1);
    }
  }, [enabled, itemCount, activeIndex, mode]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape?.();
        return;
      }

      if (itemCount === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => {
          if (mode === "clamp") {
            return Math.min(prev + 1, itemCount - 1);
          }
          return prev < itemCount - 1 ? prev + 1 : 0;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => {
          if (mode === "clamp") {
            return Math.max(prev - 1, 0);
          }
          return prev > 0 ? prev - 1 : itemCount - 1;
        });
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        onSelect?.(activeIndex);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, itemCount, activeIndex, onSelect, onEscape, mode]);

  useEffect(() => {
    if (activeDescendantId) {
      document.getElementById(activeDescendantId)?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [activeDescendantId]);

  return {
    activeIndex,
    setActiveIndex,
    getOptionId,
    activeDescendantId,
    resetActiveIndex,
  };
}
