"use client";

import { useState } from "react";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { OnboardingStepFrame } from "../components/OnboardingStepFrame";

export type SaveWithGoogleStepProps = {
  onContinue: () => void;
  onSkip: () => void;
  onBeforeSignIn: () => void;
};

export function SaveWithGoogleStep({
  onContinue,
  onSkip,
  onBeforeSignIn,
}: SaveWithGoogleStepProps) {
  const { language } = useLanguage();
  const { isLoggedIn, displayName, signInWithGoogle } = useReaderAccount();
  const [busy, setBusy] = useState(false);

  const handleGoogle = async () => {
    setBusy(true);
    onBeforeSignIn();
    try {
      await signInWithGoogle();
    } finally {
      setBusy(false);
    }
  };

  if (isLoggedIn) {
    return (
      <OnboardingStepFrame
        stepId="google"
        kicker={pickBilingualLabel(language, "Account", "अकाउंट")}
        title={pickBilingualLabel(language, "You're all set", "आप तैयार हैं")}
        subtitle={pickBilingualLabel(
          language,
          `Signed in as ${displayName}. Your preferences sync across devices.`,
          `${displayName} के रूप में लॉगिन। आपकी पसंद सभी डिवाइस पर सिंक होगी।`
        )}
        primaryLabel={pickBilingualLabel(language, "Continue", "जारी रखें")}
        onPrimary={onContinue}
        onSkip={onSkip}
      >
        <div className="ob-v3__signed-in" role="status">
          <span className="ob-v3__signed-in-badge" aria-hidden>
            ✓
          </span>
          <p>
            {pickBilingualLabel(
              language,
              "Your reading list and interests are saved to your account.",
              "आपकी रीडिंग लिस्ट और रुचियाँ अकाउंट में सहेजी गई हैं।"
            )}
          </p>
        </div>
      </OnboardingStepFrame>
    );
  }

  return (
    <OnboardingStepFrame
      stepId="google"
      kicker={pickBilingualLabel(language, "Save progress", "प्रगति सहेजें")}
      title={pickBilingualLabel(
        language,
        "Keep your feed on every device",
        "अपनी फ़ीड हर डिवाइस पर रखें"
      )}
      subtitle={pickBilingualLabel(
        language,
        "Sign in with Google to sync districts, topics, and saved stories.",
        "जिले, विषय और सहेजी खबरें सिंक करने के लिए Google से साइन इन करें।"
      )}
      primaryLabel={pickBilingualLabel(language, "Continue with Google", "Google से जारी रखें")}
      onPrimary={handleGoogle}
      onSkip={onSkip}
      primaryDisabled={busy}
      skipLabel={pickBilingualLabel(language, "Maybe later", "बाद में")}
    >
      <div className="ob-v3__google-card">
        <span className="ob-v3__google-mark" aria-hidden>
          G
        </span>
        <p>
          {pickBilingualLabel(
            language,
            "Optional — you can read as a guest and sign in anytime from your profile.",
            "वैकल्पिक — आप अतिथि के रूप में पढ़ सकते हैं और प्रोफ़ाइल से कभी भी साइन इन कर सकते हैं।"
          )}
        </p>
      </div>
    </OnboardingStepFrame>
  );
}
