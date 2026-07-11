/**
 * Accessibility utilities for design system components.
 * @module design-system/utils/a11y
 */

import type { KeyboardEvent } from "react";

/** Merge multiple refs into one callback ref */
export function mergeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return (value) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref && typeof ref === "object") {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    }
  };
}

/** Handle Enter/Space activation for custom interactive elements */
export function onKeyboardActivate(
  event: KeyboardEvent,
  callback: () => void
): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    callback();
  }
}
