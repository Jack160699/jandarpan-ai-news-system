export type PolicySlug =
  | "terms"
  | "privacy"
  | "cookies"
  | "ads-policy"
  | "community-guidelines"
  | "safety"
  | "fact-check-policy";

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
    updated: "September 2026",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: "By accessing or using Jan Darpan (https://www.jandarpan.news), operated by STRATXCEL SOLUTIONS (OPC) PRIVATE LIMITED, you agree to be bound by these Terms & Conditions and our Privacy Policy. If you do not agree to these terms, you may not access or use the platform.",
      },
      {
        heading: "2. Google Sign-In & Authentication",
        body: "Jan Darpan requires secure Google OAuth 2.0 authentication to access full live news coverage, interactive television streams, and reader engagement features. By signing in with Google, you authorize Jan Darpan to verify your identity using your standard Google profile information (name, email address, and avatar image) in strict compliance with Google API Services User Data Policy.",
      },
      {
        heading: "3. Permitted Editorial Use",
        body: "All news reports, video broadcasts, anchor transcripts, photographs, and analytical articles published on Jan Darpan are protected under Indian and international copyright law. News content is provided exclusively for personal, non-commercial reading and informational purposes. Republication, automated scraping, syndication, or redistribution without prior written consent from the publisher is strictly prohibited.",
      },
      {
        heading: "4. User Conduct & Reader Participation",
        body: "Registered readers may engage with published stories through likes, comments, and community discussions. All user submissions must comply with our Community Guidelines and applicable laws. You agree not to post defamatory, obscene, hate-inciting, unlawful, or sexually explicit material. Jan Darpan reserves the right to moderate, hide, or delete user contributions and suspend accounts that violate these rules.",
      },
      {
        heading: "5. Intellectual Property & Brand Rights",
        body: "Jan Darpan, the Jan Darpan brand lockup, official logos, masthead designs, and software systems are the exclusive intellectual property of STRATXCEL SOLUTIONS (OPC) PRIVATE LIMITED. No license or ownership right is granted by implication or otherwise.",
      },
      {
        heading: "6. Disclaimers & Limitation of Liability",
        body: "Jan Darpan strives to report accurate, fact-checked, and timely regional journalism. However, the platform and its news services are provided on an 'as is' and 'as available' basis. To the fullest extent permitted by law, Jan Darpan and its operating company disclaim all warranties and shall not be liable for any indirect, consequential, or punitive damages arising from the use of or inability to use the service.",
      },
      {
        heading: "7. Governing Law & Grievance Redressal",
        body: "These terms are governed by the laws of India. In compliance with Rule 11 of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, any statutory grievances regarding published content or platform operations may be submitted to our designated Grievance Officer at shriyanshchandrakar@gmail.com or via our Grievance Redressal portal at /grievance-redressal.",
      },
    ],
  },
  privacy: {
    slug: "privacy",
    path: "/privacy",
    titleEn: "Privacy Policy",
    titleHi: "गोपनीयता नीति",
    updated: "September 2026",
    sections: [
      {
        heading: "1. Scope & Commitment",
        body: "Jan Darpan (https://www.jandarpan.news), published by STRATXCEL SOLUTIONS (OPC) PRIVATE LIMITED, is committed to safeguarding reader privacy. This Privacy Policy explains how we collect, store, protect, and handle your personal information when you access our digital news platform and authenticate via Google Sign-In.",
      },
      {
        heading: "2. Information We Collect via Google OAuth",
        body: "When you authenticate using Google Sign-In, we request only the non-sensitive identity scopes (openid, email, profile). We collect: (a) your full name, (b) verified email address, (c) public profile image URL, and (d) Google unique user identifier. We never request access to your Google Drive, Gmail, contacts, search history, or any sensitive scopes.",
      },
      {
        heading: "3. Technical & Telemetry Data",
        body: "To maintain platform stability, localized news filtering, and compliance reporting, our servers automatically collect non-personally identifiable technical telemetry, including browser type, operating system, IP address, regional language preference (Hindi/English), and reading engagement metrics (e.g., article views, reading duration).",
      },
      {
        heading: "4. How We Use Your Information",
        body: "Your personal data is used solely to: (a) authenticate your identity and maintain your live newsroom session; (b) personalize regional district coverage based on your saved district preference; (c) attribute reader comments, reactions, and bookmarks to your profile; and (d) comply with statutory Indian digital media regulations. Jan Darpan's use of information received from Google APIs adheres to the Google API Services User Data Policy, including Limited Use requirements.",
      },
      {
        heading: "5. Data Storage, Security & Encryption",
        body: "All user profile records and session tokens are encrypted at rest using industry-standard AES-256 encryption and encrypted in transit using TLS 1.3. User credentials and authentication tokens are securely managed via enterprise-grade Supabase Auth infrastructure with Row-Level Security (RLS) policies enforcing zero cross-tenant or unauthorized data exposure.",
      },
      {
        heading: "6. Data Sharing & Third-Party Disclosure",
        body: "Jan Darpan maintains a strict zero-sale policy: we do NOT sell, lease, or monetize your personal data to advertisers, data brokers, or third parties. Limited technical data processing is conducted solely by vetted cloud infrastructure providers (Vercel for CDN hosting, Supabase for authentication and database management, Google Cloud for OAuth identity) under strict data protection agreements.",
      },
      {
        heading: "7. Retention & User Rights (Account Deletion)",
        body: "We retain your profile data only for as long as your account remains active. You possess full rights under applicable data protection laws to: (a) inspect the personal data held about you; (b) request correction of inaccurate data; (c) revoke Jan Darpan's OAuth access via your Google Account Security Settings at any time; and (d) request permanent deletion of your account, comments, and profile data by emailing our support desk at shriyanshchandrakar@gmail.com.",
      },
      {
        heading: "8. Grievance Officer & Contact",
        body: "For any questions, concerns, or data privacy requests, you may contact our designated Grievance & Data Protection Officer: Shriyansh Chandrakar, STRATXCEL SOLUTIONS (OPC) PRIVATE LIMITED, Email: shriyanshchandrakar@gmail.com, Registered Address: Raipur, Chhattisgarh, India.",
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
  "community-guidelines": {
    slug: "community-guidelines",
    path: "/community-guidelines",
    titleEn: "Community Guidelines",
    titleHi: "समुदाय दिशानिर्देश",
    updated: "May 2026",
    sections: [
      {
        heading: "Respectful participation",
        body: "Comments and community features must remain civil. Harassment, hate speech, threats, and targeted abuse are prohibited.",
      },
      {
        heading: "No spam or manipulation",
        body: "Automated spam, coordinated inauthentic behavior, and deceptive engagement are not allowed.",
      },
      {
        heading: "Reporting",
        body: "Users can flag content that violates these guidelines. Repeat violations may lead to restricted access.",
      },
    ],
  },
  safety: {
    slug: "safety",
    path: "/safety",
    titleEn: "User Safety Standards",
    titleHi: "उपयोगकर्ता सुरक्षा मानक",
    updated: "May 2026",
    sections: [
      {
        heading: "Platform safety",
        body: "Jan Darpan actively monitors harmful, abusive, misleading, and unsafe content to maintain a secure and trusted experience.",
      },
      {
        heading: "Child safety",
        body: "We do not target minors with sensitive advertising and remove material that endangers children when identified.",
      },
      {
        heading: "Emergency content",
        body: "Graphic violence and self-harm content are limited according to editorial standards and may include warnings where published.",
      },
      {
        heading: "Data protection",
        body: "Security controls protect account and preference data. See our Privacy Policy for details on retention and rights.",
      },
    ],
  },
  "fact-check-policy": {
    slug: "fact-check-policy",
    path: "/fact-check-policy",
    titleEn: "Fact Check & AI Content Policy",
    titleHi: "फैक्ट चेक और AI सामग्री नीति",
    updated: "May 2026",
    sections: [
      {
        heading: "Verification standards",
        body: "Stories are cross-checked against multiple sources before publication. Unverified rumours are not presented as confirmed fact.",
      },
      {
        heading: "Corrections",
        body: "Factual errors are corrected promptly with clear update notes on affected articles.",
      },
      {
        heading: "AI-generated content",
        body: "AI assists summaries, headlines, narration, and personalization. Human editors review high-impact and breaking coverage.",
      },
      {
        heading: "Comment moderation",
        body: "User comments may be filtered automatically and reviewed by moderators. Misinformation in comments may be removed.",
      },
    ],
  },
};

export function getPolicy(slug: string): PolicyDocument | null {
  return POLICY_DOCUMENTS[slug as PolicySlug] ?? null;
}
