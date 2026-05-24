export type PolicySlug = "terms" | "privacy" | "cookies" | "ads-policy";

export type PolicyDocument = {
  slug: PolicySlug;
  path: string;
  titleEn: string;
  titleHi: string;
  updated: string;
  sections: { heading: string; body: string }[];
};

export const POLICY_DOCUMENTS: Record<PolicySlug, PolicyDocument> = {
  terms: {
    slug: "terms",
    path: "/terms",
    titleEn: "Terms & Conditions",
    titleHi: "नियम और शर्तें",
    updated: "May 2026",
    sections: [
      {
        heading: "Acceptance",
        body: "By using Jan Darpan Chhattisgarh you agree to these terms. If you do not agree, please do not use the service.",
      },
      {
        heading: "Editorial use",
        body: "News content is provided for personal, non-commercial reading unless otherwise stated. Republication requires written permission.",
      },
      {
        heading: "Accounts & conduct",
        body: "You must not misuse the platform, attempt unauthorized access, or submit unlawful material through tip lines or forms.",
      },
      {
        heading: "Limitation of liability",
        body: "We strive for accuracy but do not guarantee completeness. Jan Darpan is not liable for indirect damages arising from use of the service.",
      },
    ],
  },
  privacy: {
    slug: "privacy",
    path: "/privacy",
    titleEn: "Privacy Policy",
    titleHi: "गोपनीयता नीति",
    updated: "May 2026",
    sections: [
      {
        heading: "Data we collect",
        body: "We may collect device identifiers, language preferences, reading activity, and information you submit voluntarily (e.g. news tips).",
      },
      {
        heading: "How we use data",
        body: "Data helps deliver localized news, improve performance, personalize content, and meet legal obligations.",
      },
      {
        heading: "Sharing",
        body: "We do not sell personal data. Limited sharing occurs with analytics, hosting, and advertising partners under contract.",
      },
      {
        heading: "Your rights",
        body: "You may request access, correction, or deletion of personal data where applicable law provides those rights.",
      },
    ],
  },
  cookies: {
    slug: "cookies",
    path: "/cookies",
    titleEn: "Cookie Policy",
    titleHi: "कुकी नीति",
    updated: "May 2026",
    sections: [
      {
        heading: "What are cookies",
        body: "Cookies are small files stored on your device to remember preferences and measure site usage.",
      },
      {
        heading: "Essential cookies",
        body: "Required for language selection, security, and core navigation. These cannot be disabled for the app to function.",
      },
      {
        heading: "Analytics & ads",
        body: "Optional cookies help us understand traffic and deliver relevant advertising. You can manage these in your browser settings.",
      },
    ],
  },
  "ads-policy": {
    slug: "ads-policy",
    path: "/ads-policy",
    titleEn: "Personalized Ads Policy",
    titleHi: "व्यक्तिगत विज्ञापन नीति",
    updated: "May 2026",
    sections: [
      {
        heading: "Personalization",
        body: "We and partners may use cookies and similar technologies to show ads based on interests inferred from reading patterns and device data.",
      },
      {
        heading: "Controls",
        body: "You can limit ad tracking in your device or browser settings. Continued use after consenting on onboarding implies acceptance of this policy.",
      },
      {
        heading: "Children",
        body: "Our service is not directed at children under 13. We do not knowingly personalize ads for child audiences.",
      },
    ],
  },
};

export function getPolicy(slug: string): PolicyDocument | null {
  return POLICY_DOCUMENTS[slug as PolicySlug] ?? null;
}
