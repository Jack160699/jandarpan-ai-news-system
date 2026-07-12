"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { ProfileSection } from "./ProfileSection";
import { SettingToggle } from "./SettingToggle";
import { useProfileV3Prefs } from "../hooks/useProfileV3Prefs";

export function PrivacySettingsSection() {
  const { language } = useLanguage();
  const { prefs, update } = useProfileV3Prefs();

  return (
    <ProfileSection
      id="privacy-settings"
      kicker={pickBilingualLabel(language, "Trust", "विश्वास")}
      title={pickBilingualLabel(language, "Privacy settings", "गोपनीयता सेटिंग")}
      description={pickBilingualLabel(
        language,
        "Control how your reading activity is used on this device.",
        "इस डिवाइस पर आपकी पढ़ने की गतिविधि कैसे उपयोग हो, नियंत्रित करें।"
      )}
      action={<Shield size={18} className="pv3-section-icon" aria-hidden />}
    >
      <div className="pv3-settings">
        <SettingToggle
          id="pv3-privacy-history"
          label={pickBilingualLabel(language, "Show reading history", "पढ़ने का इतिहास दिखाएं")}
          hint={pickBilingualLabel(
            language,
            "Display recently read stories in your profile.",
            "प्रोफ़ाइल में हाल की खबरें दिखाएं।"
          )}
          checked={prefs.showReadingHistory}
          onChange={(checked) => update({ showReadingHistory: checked })}
        />
        <SettingToggle
          id="pv3-privacy-personalized"
          label={pickBilingualLabel(language, "Personalized recommendations", "व्यक्तिगत सुझाव")}
          hint={pickBilingualLabel(
            language,
            "Use your interests and reading patterns for feed ranking.",
            "फीड रैंकिंग के लिए रुचियाँ और पढ़ने के पैटर्न उपयोग करें।"
          )}
          checked={prefs.personalizedFeed}
          onChange={(checked) => update({ personalizedFeed: checked })}
        />
        <SettingToggle
          id="pv3-privacy-analytics"
          label={pickBilingualLabel(language, "Limit usage analytics", "उपयोग एनालिटिक्स सीमित करें")}
          hint={pickBilingualLabel(
            language,
            "Reduce anonymous reading analytics on this device.",
            "इस डिवाइस पर अनाम पढ़ने के एनालिटिक्स कम करें।"
          )}
          checked={prefs.analyticsOptOut}
          onChange={(checked) => update({ analyticsOptOut: checked })}
        />
      </div>

      <div className="pv3-settings__links">
        <Link href="/privacy" className="pv3-settings__link">
          {pickBilingualLabel(language, "Privacy policy", "गोपनीयता नीति")}
        </Link>
        <Link href="/terms" className="pv3-settings__link">
          {pickBilingualLabel(language, "Terms of use", "उपयोग की शर्तें")}
        </Link>
      </div>

      <p className="pv3-settings__note" role="note">
        {pickBilingualLabel(
          language,
          "Your profile data stays on this device unless you sign in. We never sell reader data.",
          "साइन इन किए बिना प्रोफ़ाइल डेटा इस डिवाइस पर रहता है। हम पाठक डेटा नहीं बेचते।"
        )}
      </p>
    </ProfileSection>
  );
}
