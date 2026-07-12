"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import { isOnboardingV3Enabled } from "./config";
import { OnboardingSheet } from "./components/OnboardingSheet";
import { useOnboardingV3State } from "./hooks/useOnboardingV3State";
import { WelcomeStep } from "./steps/WelcomeStep";
import { DistrictStep } from "./steps/DistrictStep";
import { InterestsStep } from "./steps/InterestsStep";
import { NotificationsStep } from "./steps/NotificationsStep";
import { SaveWithGoogleStep } from "./steps/SaveWithGoogleStep";
import { CompleteStep } from "./steps/CompleteStep";
import "./styles/onboarding-v3.css";

/**
 * JDP-019 — Premium onboarding flow (bottom sheet, 6 steps, skip + progress).
 */
export function OnboardingExperienceV3() {
  const { contentLocked } = useLanguage();
  const {
    visible,
    step,
    stepIndex,
    totalSteps,
    progress,
    notificationPrefs,
    complete,
    skipStep,
    goNext,
    updateNotificationPrefs,
  } = useOnboardingV3State();

  if (!isOnboardingV3Enabled() || contentLocked || !visible) {
    return null;
  }

  const finish = () => {
    complete();
  };

  return (
    <OnboardingSheet
      open
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      progress={progress}
      onSkipStep={skipStep}
    >
      {step === "welcome" ? (
        <WelcomeStep onContinue={goNext} onSkip={skipStep} />
      ) : null}
      {step === "district" ? (
        <DistrictStep onContinue={goNext} onSkip={skipStep} />
      ) : null}
      {step === "interests" ? (
        <InterestsStep onContinue={goNext} onSkip={skipStep} />
      ) : null}
      {step === "notifications" ? (
        <NotificationsStep
          prefs={notificationPrefs}
          onPrefsChange={updateNotificationPrefs}
          onContinue={goNext}
          onSkip={skipStep}
        />
      ) : null}
      {step === "google" ? (
        <SaveWithGoogleStep
          onContinue={goNext}
          onSkip={skipStep}
          onBeforeSignIn={complete}
        />
      ) : null}
      {step === "complete" ? <CompleteStep onFinish={finish} /> : null}
    </OnboardingSheet>
  );
}
