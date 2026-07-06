import type { PolicyDocument } from "@/lib/legal/policies";

const CONTACT = "hello@jandarpan.news";

export const FOUNDATION_POLICY_DOCUMENTS: Record<string, PolicyDocument> = {
  "editorial-policy": {
    slug: "editorial-policy" as never,
    path: "/editorial-policy",
    titleEn: "Editorial Policy",
    titleHi: "संपादकीय नीति",
    updated: "July 2026",
    sections: [
      {
        heading: "AI-assisted newsroom",
        body: "Jan Darpan operates an AI-assisted regional newsroom. Artificial intelligence supports headline drafting, taxonomy, summarization, and personalization. Human editors retain final authority on breaking news, sensitive topics, and all published reports.",
      },
      {
        heading: "Editorial standards",
        body: "We verify claims against multiple independent sources before publication. Wire copy, district bureau reports, and partner feeds are cross-checked. We attribute reporting clearly and distinguish confirmed facts from developing information.",
      },
      {
        heading: "Accuracy",
        body: "Accuracy is our primary obligation to readers. Unverified rumours are not presented as confirmed fact. When information is incomplete, we say so explicitly and update stories as facts emerge.",
      },
      {
        heading: "Corrections & updates",
        body: "Factual errors are corrected promptly with clear update notes on affected articles. Material changes to a story are timestamped so readers can see what changed and when.",
      },
      {
        heading: "Transparency",
        body: "We disclose when AI tools assist in content production. Sponsored or partner content is labelled. Our fact-check and AI content standards are published separately and applied across the newsroom.",
      },
      {
        heading: "Contact",
        body: `Editorial questions and standards inquiries: ${CONTACT}.`,
      },
    ],
  },
  corrections: {
    slug: "corrections" as never,
    path: "/corrections",
    titleEn: "Corrections Policy",
    titleHi: "सुधार नीति",
    updated: "July 2026",
    sections: [
      {
        heading: "Report a mistake",
        body: "Readers can report factual errors, unclear attribution, or outdated information on any published story. We welcome corrections from the public, sources, and subjects of our reporting.",
      },
      {
        heading: "Review process",
        body: "Every correction request is reviewed by an editor. We verify the claim against our records and source material before making changes. Requests that require additional reporting may take longer to resolve.",
      },
      {
        heading: "Logged updates",
        body: "Approved corrections are applied to the article with an update note explaining what changed. Significant corrections are logged internally for editorial quality review.",
      },
      {
        heading: "How to reach us",
        body: `Send correction requests to ${CONTACT} with the article URL, the error you believe we made, and any supporting evidence. We aim to acknowledge requests within two business days.`,
      },
    ],
  },
  "copyright-content-removal": {
    slug: "copyright-content-removal" as never,
    path: "/copyright-content-removal",
    titleEn: "Copyright & Content Removal Policy",
    titleHi: "कॉपीराइट और सामग्री हटाने की नीति",
    updated: "July 2026",
    sections: [
      {
        heading: "Copyright ownership",
        body: "Original reporting, photography, graphics, and editorial presentation published by Jan Darpan are protected by copyright. Republication, redistribution, or commercial use requires written permission unless otherwise stated.",
      },
      {
        heading: "Fair use",
        body: "Limited quotation for criticism, commentary, news reporting, or research may qualify as fair use under applicable law. Fair use determinations depend on purpose, amount, and effect on the original work. When in doubt, contact us before reuse.",
      },
      {
        heading: "Content removal requests",
        body: "Rights holders or authorized agents may request removal of material they believe infringes copyright or violates their rights. Submit a clear description of the work, the URL on our site, and evidence of ownership or authorization.",
      },
      {
        heading: "Response process",
        body: "We review removal requests promptly. Valid requests result in content takedown, correction, or licensing discussion as appropriate. We may contact the submitter for additional information. Repeat or bad-faith requests may be declined.",
      },
      {
        heading: "Contact",
        body: `Copyright and content removal requests: ${CONTACT}. Include your name, contact details, and a statement made in good faith that the information in your notice is accurate.`,
      },
    ],
  },
};

export function getFoundationPolicy(slug: string): PolicyDocument | null {
  return FOUNDATION_POLICY_DOCUMENTS[slug] ?? null;
}

export const LEGAL_SITEMAP_PATHS = [
  "/about",
  "/contact",
  "/editorial-policy",
  "/corrections",
  "/copyright-content-removal",
  "/privacy",
  "/terms",
  "/cookies",
  "/ads-policy",
  "/community-guidelines",
  "/safety",
  "/fact-check-policy",
  "/feed.xml",
] as const;
