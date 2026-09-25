/**
 * CANONICAL STATUTORY IDENTITY & COMPLIANCE DEFINITIONS
 * Authoritative Ministry of Information & Broadcasting (MIB) IT Rules, Part III Reference.
 * 
 * CRITICAL RULE: DO NOT MODIFY THESE VALUES WITHOUT EXPLICIT STATUTORY EVIDENCE.
 */

export const CANONICAL_IDENTITY = {
  publication: {
    name: "Jan Darpan",
    nameHi: "जन दर्पण",
    website: "https://www.jandarpan.news",
    description: "Independent digital news and current-affairs publication focusing on Chhattisgarh and national affairs.",
    languages: ["Hindi", "English"],
  },
  legalEntity: {
    legalName: "STRATXCEL SOLUTIONS (OPC) PRIVATE LIMITED",
    cin: "U70200CT2025OPC017739",
    registeredOffice: {
      addressLine: "638-JUHI TALPURI, B-BLOCK",
      landmark: "Civic Centre",
      city: "Bhilai",
      district: "Durg",
      state: "Chhattisgarh",
      postalCode: "490006",
      country: "India",
      formatted: "638-JUHI TALPURI, B-BLOCK, Civic Centre, Bhilai, Durg, Chhattisgarh – 490006, India",
    },
    incorporationDate: "2025",
  },
  leadership: {
    founderAndDirector: "Shriyansh Chandrakar",
    directorDesignation: "Director & Founder",
    editorialAccountability: "Shriyansh Chandrakar",
  },
  grievanceOfficer: {
    name: "Shriyansh Chandrakar",
    designation: "Grievance Officer, Jan Darpan",
    primaryPhone: "+91 95847 35857",
    primaryPhoneClean: "+919584735857",
    primaryWhatsApp: "+91 95847 35857",
    primaryWhatsAppClean: "919584735857",
    primaryDescription: "Personal contact of the statutory Grievance Officer for grievance redressal and urgent escalations",
    email: "shriyanshchandrakar@gmail.com",
    address: "638-JUHI TALPURI, B-BLOCK, Civic Centre, Bhilai, Durg, Chhattisgarh – 490006, India",
    responseTimeHours: 24, // Acknowledgement SLA under Rule 11
    resolutionTimeDays: 15, // Resolution SLA under Rule 11
  },
  businessAndGeneral: {
    additionalWhatsApp: "+91 77778 12777",
    additionalWhatsAppClean: "917777812777",
    additionalDescription: "Additional Jan Darpan / Business WhatsApp contact for news bureau, subscriptions, and business inquiries",
    editorialEmail: "contact@jandarpan.news",
    pressContact: "contact@jandarpan.news",
  },
  srb: {
    status: "LEVEL-II SRB MEMBERSHIP: PENDING EXTERNAL ACTION" as const,
    organization: null,
    membershipId: null,
    verified: false,
    disclaimer: "Jan Darpan is currently initiating enrollment with an MIB-recognized Self-Regulating Body (SRB) under Rule 12 of the Information Technology Rules, 2021. Until membership is confirmed by the governing body, Level-II escalation is tracked as pending external action.",
  },
  rule18: {
    status: "FORM I FURNISHING PREPARED — PENDING FORMAL SUBMISSION" as const,
    furnishingNotice: "Rule 18 is a statutory furnishing-of-information requirement under the IT Rules for digital news publishers. Jan Darpan complies with information disclosure obligations. (Note: Digital media publishers are not issued satellite broadcast licenses; do not claim 'MIB registered' status).",
  },
} as const;

export type CanonicalIdentity = typeof CANONICAL_IDENTITY;
