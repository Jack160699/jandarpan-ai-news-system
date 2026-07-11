"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useHomepageLayout } from "@/hooks/useHomepageLayout";
import { resetHomepageLayout } from "@/lib/personalization/homepage-layout";
import {
  loadOnboardingNotificationPrefs,
  saveOnboardingNotificationPrefs,
} from "../lib/notification-prefs";
import {
  ONBOARDING_V3_STEPS,
  type OnboardingNotificationPrefs,
  type OnboardingV3Step,
} from "../types";

export function useOnboardingV3State() {
  const { layout, persist } = useHomepageLayout();
  const [ready, setReady] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [notificationPrefs, setNotificationPrefs] = useState<OnboardingNotificationPrefs>(
    loadOnboardingNotificationPrefs
  );

  useEffect(() => {
    setReady(true);
    setNotificationPrefs(loadOnboardingNotificationPrefs());
  }, []);

  const step = ONBOARDING_V3_STEPS[stepIndex] ?? "complete";
  const totalSteps = ONBOARDING_V3_STEPS.length;
  const progress = Math.min(100, Math.round(((stepIndex + 1) / totalSteps) * 100));

  const complete = useCallback(() => {
    persist({ ...layout, onboardingDone: true });
  }, [layout, persist]);

  const skipAll = useCallback(() => {
    persist(resetHomepageLayout());
  }, [persist]);

  const goNext = useCallback(() => {
    setStepIndex((index) => Math.min(index + 1, totalSteps - 1));
  }, [totalSteps]);

  const goBack = useCallback(() => {
    setStepIndex((index) => Math.max(index - 1, 0));
  }, []);

  const skipStep = useCallback(() => {
    if (step === "welcome") {
      skipAll();
      return;
    }
    goNext();
  }, [goNext, skipAll, step]);

  const updateNotificationPrefs = useCallback((next: OnboardingNotificationPrefs) => {
    setNotificationPrefs(next);
    saveOnboardingNotificationPrefs(next);
  }, []);

  const visible = ready && !layout.onboardingDone;

  return useMemo(
    () => ({
      ready,
      visible,
      step,
      stepIndex,
      totalSteps,
      progress,
      notificationPrefs,
      complete,
      skipAll,
      skipStep,
      goNext,
      goBack,
      updateNotificationPrefs,
    }),
    [
      ready,
      visible,
      step,
      stepIndex,
      totalSteps,
      progress,
      notificationPrefs,
      complete,
      skipAll,
      skipStep,
      goNext,
      goBack,
      updateNotificationPrefs,
    ]
  );
}
