/**
 * Rule 18 Publisher Information Package (Form I)
 * Authoritative Ministry of Information & Broadcasting (MIB) IT Rules, 2021 (Part III)
 * 
 * Digital media news publishers are required to furnish information under Rule 18.
 * NOTE: This is a furnishing requirement, NOT a government licensing or "MIB registration".
 */

import { CANONICAL_IDENTITY } from "./canonical-identity";

export type Rule18PublisherParticulars = {
  formId: "FORM_I_RULE_18";
  publicationTitle: string;
  languages: string[];
  websiteUrl: string;
  mobileApps: string;
  socialMediaAccounts: {
    platform: string;
    handleOrUrl: string;
  }[];
  legalEntityName: string;
  cin: string;
  pan: string; // Explicitly marked if requires human input
  registeredOffice: string;
  directorName: string;
  directorContact: string;
  directorEmail: string;
  grievanceOfficerName: string;
  grievanceOfficerDesignation: string;
  grievanceOfficerPhone: string;
  grievanceOfficerEmail: string;
  grievanceOfficerAddress: string;
  newsEditor: string;
  srbMembershipStatus: string;
  srbBodyName: string | null;
  srbMembershipNumber: string | null;
  lastUpdatedDate: string;
  verificationStatus: "VERIFIED_PARTIAL_PENDING_HUMAN_INPUT" | "VERIFIED_COMPLETE";
  notes: string[];
};

export function getRule18CanonicalParticulars(): Rule18PublisherParticulars {
  return {
    formId: "FORM_I_RULE_18",
    publicationTitle: CANONICAL_IDENTITY.publication.name,
    languages: [...CANONICAL_IDENTITY.publication.languages],
    websiteUrl: CANONICAL_IDENTITY.publication.website,
    mobileApps: "NOT APPLICABLE — VERIFIED (Mobile-responsive PWA)",
    socialMediaAccounts: [
      { platform: "WhatsApp (Grievance)", handleOrUrl: `https://wa.me/${CANONICAL_IDENTITY.grievanceOfficer.primaryWhatsAppClean}` },
      { platform: "WhatsApp (News/Business)", handleOrUrl: `https://wa.me/${CANONICAL_IDENTITY.businessAndGeneral.additionalWhatsAppClean}` },
      { platform: "X (Twitter)", handleOrUrl: "https://x.com/jandarpan_news" },
      { platform: "YouTube", handleOrUrl: "https://youtube.com/@jandarpan" },
    ],
    legalEntityName: CANONICAL_IDENTITY.legalEntity.legalName,
    cin: CANONICAL_IDENTITY.legalEntity.cin,
    pan: "REQUIRES HUMAN INPUT",
    registeredOffice: CANONICAL_IDENTITY.legalEntity.registeredOffice.formatted,
    directorName: CANONICAL_IDENTITY.leadership.founderAndDirector,
    directorContact: CANONICAL_IDENTITY.grievanceOfficer.primaryPhone,
    directorEmail: CANONICAL_IDENTITY.grievanceOfficer.email,
    grievanceOfficerName: CANONICAL_IDENTITY.grievanceOfficer.name,
    grievanceOfficerDesignation: CANONICAL_IDENTITY.grievanceOfficer.designation,
    grievanceOfficerPhone: CANONICAL_IDENTITY.grievanceOfficer.primaryPhone,
    grievanceOfficerEmail: CANONICAL_IDENTITY.grievanceOfficer.email,
    grievanceOfficerAddress: CANONICAL_IDENTITY.grievanceOfficer.address,
    newsEditor: CANONICAL_IDENTITY.leadership.founderAndDirector + " (Founder & Editorial Lead)",
    srbMembershipStatus: CANONICAL_IDENTITY.srb.status,
    srbBodyName: CANONICAL_IDENTITY.srb.organization,
    srbMembershipNumber: CANONICAL_IDENTITY.srb.membershipId,
    lastUpdatedDate: "2026-09-25",
    verificationStatus: "VERIFIED_PARTIAL_PENDING_HUMAN_INPUT",
    notes: [
      "Furnishing of information under Rule 18(1) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.",
      "Jan Darpan does not claim 'MIB Registration' as digital news publishers furnish information rather than receive broadcast licenses.",
      "Self-Regulating Body (SRB) enrollment under Rule 12 is pending external processing. No fictitious association is claimed.",
      "PAN number requires human entry before formal signed PDF submission to MIB digital media portal.",
    ],
  };
}

export function generateRule18DocumentMarkdown(p: Rule18PublisherParticulars): string {
  return `# FORM I — INFORMATION FURNISHING BY PUBLISHER OF NEWS AND CURRENT AFFAIRS CONTENT
*Under Rule 18(1) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021*
*Authoritative Reference: Ministry of Information & Broadcasting (MIB), Government of India*

---

### PART A: PUBLISHER PARTICULARS

1. **Title of the Digital News Platform:** ${p.publicationTitle}
2. **Language(s) of Publication:** ${p.languages.join(", ")}
3. **Canonical Website URL:** [${p.websiteUrl}](${p.websiteUrl})
4. **Mobile Applications (if any):** ${p.mobileApps}
5. **Social Media Profiles & Channels:**
${p.socialMediaAccounts.map(s => `   - **${s.platform}:** ${s.handleOrUrl}`).join("\n")}

---

### PART B: LEGAL ENTITY DETAILS

6. **Legal Operating / Publishing Entity:** ${p.legalEntityName}
7. **Corporate Identity Number (CIN):** ${p.cin}
8. **Permanent Account Number (PAN):** ${p.pan}
9. **Registered Office Address:** 
   ${p.registeredOffice}
10. **Director / Founder:** ${p.directorName}
    - **Contact:** ${p.directorContact}
    - **Email:** ${p.directorEmail}

---

### PART C: EDITORIAL & GRIEVANCE REDRESSAL PARTICULARS

11. **News Editor / Editorial Accountability:** ${p.newsEditor}
12. **Designated Grievance Officer (Rule 11):**
    - **Name:** ${p.grievanceOfficerName}
    - **Designation:** ${p.grievanceOfficerDesignation}
    - **Primary Phone / WhatsApp:** ${p.grievanceOfficerPhone}
    - **Grievance Email:** ${p.grievanceOfficerEmail}
    - **Address:** ${p.grievanceOfficerAddress}
    - **Acknowledgement SLA:** Within 24 hours
    - **Resolution SLA:** Within 15 calendar days

---

### PART D: SELF-REGULATING BODY (SRB) PARTICULARS (RULE 12)

13. **SRB Membership Status:** \`${p.srbMembershipStatus}\`
14. **Name of the SRB:** ${p.srbBodyName ?? "PENDING EXTERNAL ENROLLMENT"}
15. **Membership Certificate / Reference Number:** ${p.srbMembershipNumber ?? "PENDING"}

> **Statutory Notice:** Jan Darpan strictly does not claim affiliation or membership with any self-regulating body until formally approved and verified. Level-II escalations will be routed to the approved body once enrolled.

---

### DECLARATION & AUDIT NOTE
- **Verification Status:** ${p.verificationStatus}
- **Last Updated:** ${p.lastUpdatedDate}
- **Document Version:** 1.0.0-Statutory
`;
}
