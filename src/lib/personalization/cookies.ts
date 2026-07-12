/** Client-side personalization cookies — mirror SSR-readable prefs */

export const INTERESTS_COOKIE = "cgb-feed-interests";
export const DISTRICT_COOKIE = "cgb-home-district";
export const RECENT_READS_COOKIE = "cgb-recent-reads";
export const ONBOARDING_COOKIE = "cgb-onboarding-done";

const ONE_YEAR = 31536000;

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${ONE_YEAR};SameSite=Lax`;
}

export function syncInterestsCookie(ids: string[]) {
  setCookie(INTERESTS_COOKIE, JSON.stringify(ids));
}

export function syncDistrictCookie(slug: string | null | undefined) {
  if (!slug?.trim()) {
    if (typeof document !== "undefined") {
      document.cookie = `${DISTRICT_COOKIE}=;path=/;max-age=0;SameSite=Lax`;
    }
    return;
  }
  setCookie(DISTRICT_COOKIE, slug.trim().toLowerCase());
}

export function syncRecentReadsCookie(slugs: string[]) {
  setCookie(RECENT_READS_COOKIE, JSON.stringify(slugs.slice(0, 8)));
}

export function syncOnboardingCookie(done: boolean) {
  setCookie(ONBOARDING_COOKIE, done ? "1" : "0");
}
