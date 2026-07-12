import {
  DEFAULT_ONBOARDING_NOTIFICATION_PREFS,
  ONBOARDING_NOTIFICATION_STORAGE_KEY,
  type OnboardingNotificationPrefs,
} from "../types";

export function loadOnboardingNotificationPrefs(): OnboardingNotificationPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_ONBOARDING_NOTIFICATION_PREFS };
  try {
    const raw = localStorage.getItem(ONBOARDING_NOTIFICATION_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ONBOARDING_NOTIFICATION_PREFS };
    return { ...DEFAULT_ONBOARDING_NOTIFICATION_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_ONBOARDING_NOTIFICATION_PREFS };
  }
}

export function saveOnboardingNotificationPrefs(prefs: OnboardingNotificationPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_NOTIFICATION_STORAGE_KEY, JSON.stringify(prefs));
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}
