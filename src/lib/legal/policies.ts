export type PolicySlug =
  | "terms"
  | "privacy"
  | "cookies"
  | "ads-policy"
  | "community-guidelines"
  | "safety"
  | "fact-check-policy"
  | "contributor-terms";

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
    updated: "27 September 2026",
    sections: [
      {
        heading: "Platform & Operator Disclosure",
        body: "Effective Date: 27 September 2026\nPlatform: Jan Darpan\nWebsite: https://www.jandarpan.news\nOperator/Publisher: STRATXCEL SOLUTIONS (OPC) PRIVATE LIMITED\n\nThese Terms & Conditions govern access to and use of Jan Darpan.\nBy creating an account or using the platform after accepting these Terms, you agree to comply with them and with applicable Indian law.",
      },
      {
        heading: "1. About Jan Darpan",
        body: "Jan Darpan is a digital news and current-affairs platform focused primarily on Chhattisgarh, with selected national and international coverage where editorially relevant.\n\nContent may include reporting, summaries, translations, analysis, visual material, audio, AI-assisted content and other editorial formats.",
      },
      {
        heading: "2. Google Authentication",
        body: "Access to the Jan Darpan platform requires Google authentication.\n\nYou are responsible for maintaining control of the Google account used to access Jan Darpan and for activity conducted through your authenticated account, subject to applicable law.\n\nYou must not attempt to bypass authentication or access another person's account.",
      },
      {
        heading: "3. Eligibility",
        body: "You must provide information that is accurate to the extent required for use of the platform.\n\nUse of the platform is subject to applicable age, privacy and consent requirements under Indian law.\n\nWe may restrict access where required for legal compliance, safety or protection of the platform.",
      },
      {
        heading: "4. News and Editorial Disclaimer",
        body: "Jan Darpan strives to provide timely, accurate and responsible reporting but does not warrant that every item will always be completely accurate, complete, current or free from error.\n\nNews may change as additional information becomes available.\n\nReaders should independently verify information before relying on it for decisions involving finance, health, law, safety, investment, employment or other material consequences.\n\nNothing on Jan Darpan constitutes professional legal, medical, financial, investment or other regulated professional advice.",
      },
      {
        heading: "5. AI-Assisted Content",
        body: "Jan Darpan may use artificial intelligence and automation for activities including translation, summarization, headline generation, narration, categorization, moderation, image processing and other editorial or operational processes.\n\nAI-assisted output may contain errors or omissions.\n\nWhere appropriate, Jan Darpan may review, modify, reject, correct or remove such content.\n\nNo AI-generated or AI-assisted content should be treated as a guarantee of factual accuracy merely because it appears on the platform.",
      },
      {
        heading: "6. Third-Party Content",
        body: "The platform may contain or reference content originating from third-party news agencies, public sources, websites, social platforms or other providers.\n\nThird-party material remains subject to the relevant owner's rights and terms.\n\nPublication, aggregation, transformation or display of third-party material does not automatically transfer ownership of that material to Jan Darpan.",
      },
      {
        heading: "7. Copyright and Intellectual Property",
        body: "Except for third-party material and material otherwise identified as belonging to another party, the Jan Darpan website, software, branding, original editorial work, interface, design and platform materials are protected by applicable intellectual-property law.\n\nYou must not copy, reproduce, scrape, republish, commercially exploit, distribute, modify or systematically extract substantial portions of Jan Darpan content without appropriate authorization or a lawful exception.\n\nNothing in these Terms removes rights available under applicable copyright law.",
      },
      {
        heading: "8. Comments and User-Generated Content",
        body: "Authenticated users may submit comments.\n\nYou must not submit content that is unlawful, threatening, abusive, defamatory, hateful, sexually explicit, invasive of privacy, fraudulent, impersonating, misleading, spam, malicious, infringing or otherwise prohibited by applicable law.\n\nYou must not publish another person's confidential or personal information without lawful authority.\n\nYou remain responsible for the content you submit.\n\nBy posting a comment, you grant Jan Darpan a non-exclusive, worldwide, royalty-free permission to host, display, reproduce, moderate and technically process that comment for operating, securing and promoting the platform, subject to applicable law.",
      },
      {
        heading: "9. Moderation",
        body: "Jan Darpan may, subject to applicable law, review, restrict, hide, remove or preserve comments or accounts where reasonably necessary to:\n• enforce these Terms;\n• maintain safety;\n• protect users;\n• address abuse;\n• respond to lawful requests;\n• investigate incidents;\n• maintain editorial standards; or\n• comply with applicable law.\n\nWe do not guarantee that all prohibited material will be detected immediately.",
      },
      {
        heading: "10. Prohibited Activities",
        body: "You must not:\n• bypass or attack authentication;\n• attempt unauthorized access;\n• interfere with platform availability;\n• introduce malware;\n• abuse APIs or automated systems;\n• scrape or systematically harvest data without authorization;\n• impersonate another person or organization;\n• manipulate engagement counts;\n• submit fraudulent comments or reports;\n• infringe intellectual-property or privacy rights;\n• use Jan Darpan for unlawful activities; or\n• violate applicable Indian law.",
      },
      {
        heading: "11. Availability and Changes",
        body: "We may modify, suspend, replace or discontinue portions of the platform where reasonably necessary for maintenance, security, development, legal compliance or operational reasons.\n\nWe do not guarantee uninterrupted availability.\n\nNews feeds, external services, hosting providers, network services and other dependencies may experience interruptions beyond our control.",
      },
      {
        heading: "12. External Links",
        body: "Jan Darpan may link to external websites and services.\n\nSuch links are provided for convenience or editorial reference.\n\nJan Darpan does not control and is not responsible for third-party websites, their availability, security, privacy practices, transactions or content.",
      },
      {
        heading: "13. Limitation of Liability",
        body: "To the maximum extent permitted by applicable law, Jan Darpan and its operator will not be liable for indirect, incidental, consequential, special or unforeseeable losses arising from use of or inability to use the platform.\n\nThis does not exclude liability that cannot lawfully be excluded or limited under Indian law, including liability arising from circumstances where such exclusion is legally prohibited.",
      },
      {
        heading: "14. Indemnity",
        body: "To the maximum extent permitted by law, you agree to indemnify and hold harmless Jan Darpan, its operator, personnel and service providers from claims, losses, liabilities, costs and reasonable expenses arising from:\n• your unlawful use of the platform;\n• your violation of these Terms;\n• your comments or other submitted content;\n• your infringement of third-party rights; or\n• your misuse of the service.\n\nThis clause applies only to the extent permitted by applicable law.",
      },
      {
        heading: "15. Account Suspension or Termination",
        body: "We may restrict or terminate access where reasonably necessary because of:\n• violation of these Terms;\n• suspected abuse or fraud;\n• security threats;\n• unlawful conduct;\n• repeated policy violations;\n• legal requirements; or\n• operational/security reasons.\n\nTermination does not remove rights or obligations that have already accrued.",
      },
      {
        heading: "16. Privacy",
        body: "Your use of Jan Darpan is also governed by our Privacy Policy.\n\nThe Privacy Policy explains how personal data is collected, used, stored, protected and processed.",
      },
      {
        heading: "17. Editorial Standards and Legal Compliance",
        body: "Jan Darpan aims to follow applicable Indian law and relevant standards governing digital news and current-affairs publishing.\n\nEditorial processes may take into account applicable provisions of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, relevant governmental directions and applicable journalistic standards.\n\nNothing in these Terms overrides applicable law.",
      },
      {
        heading: "18. Grievance Redressal",
        body: "Complaints relating to platform use, content or digital-media matters may be submitted through the designated Jan Darpan grievance mechanism.\n\nThe applicable grievance officer and contact details will be published on the Jan Darpan grievance page (/grievance-redressal).\n\nComplaints will be handled in accordance with applicable law and applicable regulatory timelines.",
      },
      {
        heading: "19. Changes to These Terms",
        body: "We may update these Terms from time to time.\n\nThe current version and effective date will be published on this page.\n\nWhere a material change requires renewed consent, we may require users to accept the updated Terms before continued access.",
      },
      {
        heading: "20. Governing Law and Jurisdiction",
        body: "These Terms are governed by the laws of India.\n\nSubject to mandatory jurisdictional requirements under applicable law, disputes shall be subject to the jurisdiction of the competent courts having territorial jurisdiction over the registered office of the operator.",
      },
      {
        heading: "21. Severability",
        body: "If any provision of these Terms is held invalid or unenforceable, the remaining provisions will continue to operate to the extent permitted by law.",
      },
      {
        heading: "22. No Waiver",
        body: "Failure to enforce any provision of these Terms immediately does not constitute a waiver of the right to enforce it later.",
      },
      {
        heading: "23. Entire Agreement",
        body: "These Terms, together with the Privacy Policy and other policies expressly incorporated into them, constitute the applicable user agreement governing use of Jan Darpan, subject to applicable law.",
      },
      {
        heading: "24. Contact",
        body: "For general support, privacy or legal-policy matters:\nEmail: shriyanshchandrakar@gmail.com\nWebsite: https://www.jandarpan.news\n\nBy continuing to use Jan Darpan after accepting these Terms, you acknowledge that you have read, understood and agreed to them.",
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
  "contributor-terms": {
    slug: "contributor-terms",
    path: "/contributor-terms",
    titleEn: "Reader Contributor Terms",
    titleHi: "पाठक योगदानकर्ता शर्तें",
    updated: "October 2026",
    sections: [
      {
        heading: "Who can post",
        body: "Only signed-in readers whose identity check has been completed through an authorised verification service can send news to Jan Darpan. Where that service is not available, posting stays switched off. Jan Darpan never asks you to type an Aadhaar number, OTP or biometric into the app and does not store any of them; only the result of the check (verified or not) and the name of the service that did it are kept.",
      },
      {
        heading: "Your story stays yours to approve",
        body: "You may write or speak your report. If you ask for an AI draft, the draft is built only from what you said; it must not add names, numbers, quotes, dates or places you did not give. Nothing is sent for review until you have read the draft and approved it yourself, and you can edit or withdraw it before it is published.",
      },
      {
        heading: "Review before publication",
        body: "Every story is reviewed by an editor before it is published. Stories may be edited, held, returned for changes, rejected or taken down, including after publication. Posting a story does not guarantee that it will be published, and a decision to publish is not a legal clearance of its contents.",
      },
      {
        heading: "What you must not send",
        body: "Do not send content that is false, defamatory, hateful, sexual, or that exposes private personal data (phone numbers, addresses, ID numbers). Do not accuse a named person of a crime without a credible source. Do not send material you do not have the right to share. Images and video must be your own or used with permission; videos must be landscape.",
      },
      {
        heading: "Rights you give us",
        body: "You keep ownership of what you send. By sending a story you give Jan Darpan a non-exclusive licence to edit, translate, publish, store and distribute it, including as audio and in search and syndication, for as long as it remains published. You can ask for removal at any time through the Grievance Redressal page; removal requests are handled under our Copyright & Content Removal Policy.",
      },
      {
        heading: "Earnings",
        body: "Revenue sharing with contributors is not active. No earnings accrue and none are promised. If it is introduced, the terms, rates and payout conditions will be published here before they apply, and only to stories published after that date.",
      },
      {
        heading: "Your data and your account",
        body: "Your submissions, media and moderation decisions are kept so that editors can review, correct or take down a story and so that disputes can be resolved. Moderation and verification actions are logged. See the Privacy Policy for retention and your rights. Jan Darpan may suspend posting for repeated or serious violations.",
      },
    ],
  },
};

export function getPolicy(slug: string): PolicyDocument | null {
  return POLICY_DOCUMENTS[slug as PolicySlug] ?? null;
}
