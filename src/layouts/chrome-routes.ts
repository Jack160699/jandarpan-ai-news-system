/**
 * Routes that render inside the full reader provider tree but hide the
 * global Header + BottomNav chrome — the page owns its own chrome instead
 * (story reader toolbar, focused search/onboarding/auth flows).
 */
const CHROME_HIDDEN_EXACT = new Set(["/search", "/onboard"]);
const CHROME_HIDDEN_PREFIXES = ["/story/", "/onboard/", "/auth/"];

export function isChromeHiddenRoute(pathname: string): boolean {
  if (CHROME_HIDDEN_EXACT.has(pathname)) return true;
  return CHROME_HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
