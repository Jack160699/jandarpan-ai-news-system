/** Shared focus-visible ring class for interactive JDS components */
export const focusRingClass = "jds-focus-ring";

/** ARIA props for loading/disabled interactive elements */
export function loadingAriaProps(loading: boolean) {
  return loading
    ? ({ "aria-busy": true as const, "aria-disabled": true as const })
    : {};
}

/** Merge tab index for disabled elements */
export function disabledTabIndex(disabled: boolean | undefined) {
  return disabled ? -1 : undefined;
}
