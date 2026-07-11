"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { isMorningBriefEnabled } from "@/lib/morning-brief/config";
import { ProfileSection } from "./ProfileSection";
import { SettingToggle } from "./SettingToggle";
import { useProfileV3Prefs } from "../hooks/useProfileV3Prefs";

export function NotificationPreferencesSection() {
  const { language, t } = useLanguage();
  const { prefs, update } = useProfileV3Prefs();
  const morningBriefOn = isMorningBriefEnabled();

  return (
    <ProfileSection
      id="notification-preferences"
      kicker={pickBilingualLabel(language, "Alerts", "अलर्ट")}
      title={t.profile.notifications}
      description={t.profile.notificationsHint}
      action={<Bell size={18} className="pv3-section-icon" aria-hidden />}
    >
      <div className="pv3-settings">
        <SettingToggle
          id="pv3-notif-breaking"
          label={pickBilingualLabel(language, "Breaking news alerts", "ब्रेकिंग न्यूज़ अलर्ट")}
          hint={pickBilingualLabel(
            language,
            "High-priority breaking stories from the state desk.",
            "राज्य डेस्क की प्राथमिक ब्रेकिंग खबरें।"
          )}
          checked={prefs.breakingAlerts}
          onChange={(checked) => update({ breakingAlerts: checked })}
        />
        <SettingToggle
          id="pv3-notif-live"
          label={pickBilingualLabel(language, "Live desk updates", "लाइव डेस्क अपडेट")}
          hint={pickBilingualLabel(
            language,
            "Updates from live coverage and rolling stories.",
            "लाइव कवरेज और रोलिंग खबरों के अपडेट।"
          )}
          checked={prefs.liveDeskAlerts}
          onChange={(checked) => update({ liveDeskAlerts: checked })}
        />
        <SettingToggle
          id="pv3-notif-morning"
          label={pickBilingualLabel(language, "Morning brief", "मॉर्निंग ब्रीफ")}
          hint={
            morningBriefOn
              ? pickBilingualLabel(
                  language,
                  "Daily morning digest reminders.",
                  "रोज़ सुबह का संक्षिप्त सारांश।"
                )
              : pickBilingualLabel(
                  language,
                  "Available when Morning Brief is enabled.",
                  "जब मॉर्निंग ब्रीफ चालू हो तब उपलब्ध।"
                )
          }
          checked={prefs.morningBriefAlerts}
          disabled={!morningBriefOn}
          onChange={(checked) => update({ morningBriefAlerts: checked })}
        />
      </div>

      <div className="pv3-settings__links">
        <Link href="/live" className="pv3-settings__link">
          {pickBilingualLabel(language, "Live coverage hub", "लाइव कवरेज हब")}
        </Link>
        {morningBriefOn ? (
          <Link href="/morning-brief" className="pv3-settings__link">
            {pickBilingualLabel(language, "Morning brief hub", "मॉर्निंग ब्रीफ हब")}
          </Link>
        ) : null}
      </div>

      <p className="pv3-settings__note" role="note">
        {pickBilingualLabel(
          language,
          "Push notifications require browser permission. Alert preferences are stored on this device.",
          "पुश नोटिफिकेशन के लिए ब्राउज़र अनुमति चाहिए। अलर्ट प्राथमिकताएँ इस डिवाइस पर सहेजी जाती हैं।"
        )}
      </p>
    </ProfileSection>
  );
}
