import type { PolicyDocument } from "@/lib/legal/policies";
import { CANONICAL_IDENTITY } from "@/lib/compliance/canonical-identity";

const CONTACT = CANONICAL_IDENTITY.businessAndGeneral.editorialEmail;
const GRIEVANCE_EMAIL = CANONICAL_IDENTITY.grievanceOfficer.email;
const GRIEVANCE_PHONE = CANONICAL_IDENTITY.grievanceOfficer.primaryPhone;

export const FOUNDATION_POLICY_DOCUMENTS: Record<string, PolicyDocument> = {
  "editorial-policy": {
    slug: "editorial-policy" as never,
    path: "/editorial-policy",
    titleEn: "Editorial Policy & Code of Ethics",
    titleHi: "संपादकीय नीति एवं आचार संहिता",
    updated: "February 2026",
    sections: [
      {
        heading: "Statutory Code of Ethics Compliance",
        body: "Jan Darpan adheres to the Code of Ethics applicable to digital news and current-affairs publishers under Part III of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 (as amended). This includes adherence to the Norms of Journalistic Conduct prescribed by the Press Council of India and the Programme Code under the Cable Television Networks (Regulation) Act, 1995, adapted for digital media.",
      },
      {
        heading: "AI-assisted newsroom standards",
        body: "Jan Darpan operates an AI-assisted regional newsroom. Artificial intelligence supports headline drafting, taxonomy, summarization, and personalization. AI models are strictly prohibited from hallucinating or fabricating facts, quotes, statistics, or sources. Human editors retain final authority on breaking news, sensitive topics, and all published reports.",
      },
      {
        heading: "Editorial standards & verification",
        body: "We verify claims against multiple independent sources before publication. Wire copy, district bureau reports, and partner feeds are cross-checked. We attribute reporting clearly and distinguish confirmed facts from developing information.",
      },
      {
        heading: "Accuracy & impartiality",
        body: "Accuracy is our primary obligation to readers. Unverified rumours are not presented as confirmed fact. When information is incomplete, we say so explicitly and update stories as facts emerge. Editorial opinions are distinctly identified from news reporting.",
      },
      {
        heading: "Corrections & updates",
        body: "Factual errors are corrected promptly with clear update notes on affected articles. Material changes to a story are timestamped so readers can see what changed and when.",
      },
      {
        heading: "Harmful misinformation & public safety",
        body: "Content that incites violence, endangers public safety, defames individuals without substantiated evidence, or violates the integrity of the nation is strictly barred from publication. In the event of an inadvertent factual error, immediate rectification is initiated under our editorial oversight protocol.",
      },
      {
        heading: "Grievance redressal contact",
        body: `For editorial standards questions, contact ${CONTACT}. To register a formal grievance under IT Rules Rule 11, contact the designated Grievance Officer at ${GRIEVANCE_EMAIL} or via WhatsApp at ${GRIEVANCE_PHONE}.`,
      },
    ],
  },
  corrections: {
    slug: "corrections" as never,
    path: "/corrections",
    titleEn: "Corrections Policy",
    titleHi: "सुधार नीति",
    updated: "February 2026",
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
        heading: "Logged updates & versioning",
        body: "Approved corrections are applied to the article with an update note explaining what changed. Significant corrections are logged internally for editorial quality review and preserved in our content versioning archive.",
      },
      {
        heading: "How to reach us",
        body: `Send correction requests to ${GRIEVANCE_EMAIL} with the article URL, the error you believe was made, and any supporting evidence. Formal statutory grievances are acknowledged within 24 hours under our Rule 11 redressal process.`,
      },
    ],
  },
  "copyright-content-removal": {
    slug: "copyright-content-removal" as never,
    path: "/copyright-content-removal",
    titleEn: "Copyright & Content Removal Policy",
    titleHi: "कॉपीराइट और सामग्री हटाने की नीति",
    updated: "February 2026",
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
        body: "We review removal requests promptly. Valid requests result in content takedown, correction, or licensing discussion as appropriate. Human editorial decision-makers review every claim before content modification.",
      },
      {
        heading: "Contact",
        body: `Copyright and content removal requests: ${GRIEVANCE_EMAIL}. Include your name, contact details, the target article URL, and a statement made in good faith that the information in your notice is accurate.`,
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
  "/grievance-redressal",
  "/compliance",
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
