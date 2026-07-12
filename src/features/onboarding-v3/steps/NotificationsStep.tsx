"use client";

import { useState } from "react";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { requestBrowserNotificationPermission } from "../lib/notification-prefs";
import type { OnboardingNotificationPrefs } from "../types";
import { OnboardingStepFrame } from "../components/OnboardingStepFrame";

export type NotificationsStepProps = {
  prefs: OnboardingNotificationPrefs;
  onPrefsChange: (prefs: OnboardingNotificationPrefs) => void;
  onContinue: () => void;
  onSkip: () => void;
};

type ToggleKey = keyof OnboardingNotificationPrefs;

const TOGGLE_OPTIONS: {
  key: ToggleKey;
  labelEn: string;
  labelHi: string;
  descEn: string;
  descHi: string;
}[] = [
  {
    key: "breakingAlerts",
    labelEn: "Breaking news",
    labelHi: "ब्रेकिंग न्यूज़",
    descEn: "Urgent headlines from your district and statewide desks.",
    descHi: "आपके जिले और राज्य डेस्क की तत्काल सुर्खियाँ।",
  },
  {
    key: "governmentAlerts",
    labelEn: "Government updates",
    labelHi: "सरकारी अपडेट",
    descEn: "Schemes, orders, and official announcements.",
    descHi: "योजनाएँ, आदेश और आधिकारिक घोषणाएँ।",
  },
  {
    key: "districtDigest",
    labelEn: "District digest",
    labelHi: "जिला डाइजेस्ट",
    descEn: "A daily roundup of stories from your home district.",
    descHi: "आपके होम जिले की दैनिक खबरों का सारांश।",
  },
];

export function NotificationsStep({
  prefs,
  onPrefsChange,
  onContinue,
  onSkip,
}: NotificationsStepProps) {
  const { language } = useLanguage();
  const [status, setStatus] = useState<string | null>(null);

  const toggle = (key: ToggleKey) => {
    onPrefsChange({ ...prefs, [key]: !prefs[key] });
  };

  const enableAlerts = async () => {
    const permission = await requestBrowserNotificationPermission();
    if (permission === "granted") {
      setStatus(
        pickBilingualLabel(
          language,
          "Alerts enabled on this device.",
          "इस डिवाइस पर अलर्ट सक्षम हैं।"
        )
      );
      return;
    }
    if (permission === "denied") {
      setStatus(
        pickBilingualLabel(
          language,
          "Notifications are blocked in browser settings. You can change this later.",
          "ब्राउज़र सेटिंग्स में सूचनाएँ ब्लॉक हैं। आप बाद में बदल सकते हैं।"
        )
      );
      return;
    }
    if (permission === "unsupported") {
      setStatus(
        pickBilingualLabel(
          language,
          "This browser does not support push alerts yet.",
          "यह ब्राउज़र अभी पुश अलर्ट सपोर्ट नहीं करता।"
        )
      );
    }
  };

  return (
    <OnboardingStepFrame
      stepId="notifications"
      kicker={pickBilingualLabel(language, "Stay informed", "जानकारी में रहें")}
      title={pickBilingualLabel(
        language,
        "Never miss what matters",
        "ज़रूरी खबर कभी न चूकें"
      )}
      subtitle={pickBilingualLabel(
        language,
        "Choose the alerts you want. You can fine-tune these anytime in settings.",
        "जो अलर्ट चाहिए चुनें। सेटिंग्स में कभी भी बदल सकते हैं।"
      )}
      primaryLabel={pickBilingualLabel(language, "Continue", "जारी रखें")}
      onPrimary={onContinue}
      onSkip={onSkip}
    >
      <ul className="ob-v3__toggle-list" role="list">
        {TOGGLE_OPTIONS.map((option) => {
          const checked = prefs[option.key];
          const inputId = `ob-v3-notify-${option.key}`;
          return (
            <li key={option.key} className="ob-v3__toggle-row">
              <label htmlFor={inputId} className="ob-v3__toggle-label">
                <span className="ob-v3__toggle-title">
                  {pickBilingualLabel(language, option.labelEn, option.labelHi)}
                </span>
                <span className="ob-v3__toggle-desc">
                  {pickBilingualLabel(language, option.descEn, option.descHi)}
                </span>
              </label>
              <input
                id={inputId}
                type="checkbox"
                className="ob-v3__toggle-input"
                checked={checked}
                onChange={() => toggle(option.key)}
              />
            </li>
          );
        })}
      </ul>

      <button type="button" className="ob-v3__secondary tap-target" onClick={enableAlerts}>
        {pickBilingualLabel(
          language,
          "Enable device notifications",
          "डिवाइस सूचनाएँ सक्षम करें"
        )}
      </button>

      {status ? (
        <p className="ob-v3__status" role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
    </OnboardingStepFrame>
  );
}
