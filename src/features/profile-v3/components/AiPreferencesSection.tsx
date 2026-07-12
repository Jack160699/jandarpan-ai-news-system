"use client";

import Link from "next/link";
import { Bot } from "lucide-react";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { isAiAssistantV3Enabled } from "@/lib/ai-assistant/config";
import { ProfileSection } from "./ProfileSection";
import { SettingToggle } from "./SettingToggle";
import { useProfileV3Prefs } from "../hooks/useProfileV3Prefs";

export function AiPreferencesSection() {
  const { language } = useLanguage();
  const { prefs, update, hydrated } = useProfileV3Prefs();
  const aiAssistantOn = isAiAssistantV3Enabled();

  return (
    <ProfileSection
      id="ai-preferences"
      kicker={pickBilingualLabel(language, "AI", "एआई")}
      title={pickBilingualLabel(language, "AI preferences", "एआई प्राथमिकताएँ")}
      description={pickBilingualLabel(
        language,
        "Control how AI summaries and assistants appear in your reading experience.",
        "पढ़ने के अनुभव में एआई सारांश और असिस्टेंट कैसे दिखें, नियंत्रित करें।"
      )}
      action={<Bot size={18} className="pv3-section-icon" aria-hidden />}
    >
      <div className="pv3-settings">
        <SettingToggle
          id="pv3-ai-summary"
          label={pickBilingualLabel(language, "AI story summaries", "एआई खबर सारांश")}
          hint={pickBilingualLabel(
            language,
            "Show AI-generated key points on article pages.",
            "आर्टिकल पेज पर एआई से बने मुख्य बिंदु दिखाएं।"
          )}
          checked={prefs.aiSummaryEnabled}
          onChange={(checked) => update({ aiSummaryEnabled: checked })}
        />
        <SettingToggle
          id="pv3-ai-assistant"
          label={pickBilingualLabel(language, "AI assistant", "एआई असिस्टेंट")}
          hint={
            aiAssistantOn
              ? pickBilingualLabel(
                  language,
                  "Enable the newsroom AI assistant for questions.",
                  "सवालों के लिए न्यूज़रूम एआई असिस्टेंट चालू करें।"
                )
              : pickBilingualLabel(
                  language,
                  "Available when AI Assistant is enabled for your edition.",
                  "जब एडिशन में एआई असिस्टेंट चालू हो तब उपलब्ध।"
                )
          }
          checked={prefs.aiAssistantEnabled}
          disabled={!aiAssistantOn}
          onChange={(checked) => update({ aiAssistantEnabled: checked })}
        />
        <SettingToggle
          id="pv3-ai-voice"
          label={pickBilingualLabel(language, "AI voice playback", "एआई आवाज़ प्लेबैक")}
          hint={pickBilingualLabel(
            language,
            "Prefer AI-narrated listen mode when available.",
            "उपलब्ध हो तो एआई आवाज़ में सुनने का मोड पसंद करें।"
          )}
          checked={prefs.aiVoiceEnabled}
          onChange={(checked) => update({ aiVoiceEnabled: checked })}
        />
      </div>

      {aiAssistantOn && prefs.aiAssistantEnabled ? (
        <p className="pv3-settings__link-row">
          <Link href="/ai-assistant" className="pv3-settings__link">
            {pickBilingualLabel(language, "Open AI assistant", "एआई असिस्टेंट खोलें")}
          </Link>
        </p>
      ) : null}

      {!hydrated ? null : (
        <p className="pv3-settings__note" role="note">
          {pickBilingualLabel(
            language,
            "Preferences are saved on this device only.",
            "प्राथमिकताएँ केवल इस डिवाइस पर सहेजी जाती हैं।"
          )}
        </p>
      )}
    </ProfileSection>
  );
}
