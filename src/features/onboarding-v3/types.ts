export const ONBOARDING_V3_STEPS = [
  "welcome",
  "district",
  "interests",
  "notifications",
  "google",
  "complete",
] as const;

export type OnboardingV3Step = (typeof ONBOARDING_V3_STEPS)[number];

export type OnboardingNotificationPrefs = {
  breakingAlerts: boolean;
  governmentAlerts: boolean;
  districtDigest: boolean;
};

export const DEFAULT_ONBOARDING_NOTIFICATION_PREFS: OnboardingNotificationPrefs = {
  breakingAlerts: true,
  governmentAlerts: false,
  districtDigest: true,
};

export const ONBOARDING_NOTIFICATION_STORAGE_KEY = "cgb-onboarding-notifications";
