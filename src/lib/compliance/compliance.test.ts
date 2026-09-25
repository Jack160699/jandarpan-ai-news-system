import { describe, it, expect } from "vitest";
import { CANONICAL_IDENTITY } from "./canonical-identity";
import {
  calculateGrievanceSla,
  generateGrievanceId,
} from "./grievance-service";
import {
  getPreviousMonthString,
  buildPublicMonthlyDisclosureMarkdown,
  type MonthlyComplianceMetrics,
} from "./monthly-report";
import {
  getRule18CanonicalParticulars,
  generateRule18DocumentMarkdown,
} from "./rule18";

describe("Jan Darpan Statutory Compliance System", () => {
  describe("Canonical Legal & Compliance Identity", () => {
    it("has the verified publisher corporate identity", () => {
      expect(CANONICAL_IDENTITY.publication.name).toBe("Jan Darpan");
      expect(CANONICAL_IDENTITY.publication.website).toBe("https://www.jandarpan.news");
      expect(CANONICAL_IDENTITY.legalEntity.legalName).toBe("STRATXCEL SOLUTIONS (OPC) PRIVATE LIMITED");
      expect(CANONICAL_IDENTITY.legalEntity.cin).toBe("U70200CT2025OPC017739");
      expect(CANONICAL_IDENTITY.legalEntity.registeredOffice.city).toBe("Bhilai");
      expect(CANONICAL_IDENTITY.legalEntity.registeredOffice.postalCode).toBe("490006");
      expect(CANONICAL_IDENTITY.leadership.founderAndDirector).toBe("Shriyansh Chandrakar");
    });

    it("has verified Grievance Officer details and explicit WhatsApp intake channels", () => {
      expect(CANONICAL_IDENTITY.grievanceOfficer.name).toBe("Shriyansh Chandrakar");
      expect(CANONICAL_IDENTITY.grievanceOfficer.designation).toBe("Grievance Officer, Jan Darpan");
      expect(CANONICAL_IDENTITY.grievanceOfficer.primaryPhone).toBe("+91 95847 35857");
      expect(CANONICAL_IDENTITY.grievanceOfficer.primaryWhatsApp).toBe("+91 95847 35857");
      expect(CANONICAL_IDENTITY.grievanceOfficer.email).toBe("shriyanshchandrakar@gmail.com");
      expect(CANONICAL_IDENTITY.businessAndGeneral.additionalWhatsApp).toBe("+91 77778 12777");
    });

    it("does NOT make fake claims regarding SRB membership or MIB registration", () => {
      expect(CANONICAL_IDENTITY.srb.status).toBe("LEVEL-II SRB MEMBERSHIP: PENDING EXTERNAL ACTION");
      expect(CANONICAL_IDENTITY.srb.verified).toBe(false);
      expect(CANONICAL_IDENTITY.srb.organization).toBeNull();
    });
  });

  describe("Grievance Redressal SLA Clock (Rule 11)", () => {
    it("generates sequential grievance IDs matching JD-GR-YYYYMM-XXXX", () => {
      const id = generateGrievanceId("202609", 42);
      expect(id).toBe("JD-GR-202609-0042");
      expect(id).toMatch(/^JD-GR-\d{6}-\d{4}$/);
    });

    it("evaluates Normal SLA state for fresh grievances (< 7 days)", () => {
      const now = new Date();
      const sla = calculateGrievanceSla(now, "ACKNOWLEDGED");
      expect(sla.daysOpen).toBe(0);
      expect(sla.isOverdue).toBe(false);
      expect(sla.alertTier).toBe("NORMAL");
      expect(sla.slaSeverity).toBe("green");
    });

    it("triggers DAY_7 warning alert", () => {
      const past7 = new Date(Date.now() - 7.5 * 24 * 60 * 60 * 1000);
      const sla = calculateGrievanceSla(past7, "UNDER_REVIEW");
      expect(sla.daysOpen).toBe(7);
      expect(sla.alertTier).toBe("DAY_7");
      expect(sla.slaSeverity).toBe("yellow");
    });

    it("triggers DAY_10 warning alert", () => {
      const past10 = new Date(Date.now() - 10.5 * 24 * 60 * 60 * 1000);
      const sla = calculateGrievanceSla(past10, "UNDER_REVIEW");
      expect(sla.daysOpen).toBe(10);
      expect(sla.alertTier).toBe("DAY_10");
      expect(sla.slaSeverity).toBe("yellow");
    });

    it("triggers DAY_12 high alert", () => {
      const past12 = new Date(Date.now() - 12.5 * 24 * 60 * 60 * 1000);
      const sla = calculateGrievanceSla(past12, "UNDER_REVIEW");
      expect(sla.daysOpen).toBe(12);
      expect(sla.alertTier).toBe("DAY_12");
      expect(sla.slaSeverity).toBe("orange");
    });

    it("triggers DAY_14 critical alert", () => {
      const past14 = new Date(Date.now() - 14.2 * 24 * 60 * 60 * 1000);
      const sla = calculateGrievanceSla(past14, "UNDER_REVIEW");
      expect(sla.daysOpen).toBe(14);
      expect(sla.alertTier).toBe("DAY_14_CRITICAL");
      expect(sla.slaSeverity).toBe("red");
    });

    it("triggers DAY_15_EXCEEDED critical statutory violation state", () => {
      const past16 = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000);
      const sla = calculateGrievanceSla(past16, "UNDER_REVIEW");
      expect(sla.daysOpen).toBe(16);
      expect(sla.isOverdue).toBe(true);
      expect(sla.alertTier).toBe("DAY_15_EXCEEDED");
      expect(sla.slaSeverity).toBe("red");
    });

    it("marks resolved grievances as compliant regardless of days open", () => {
      const past20 = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      const sla = calculateGrievanceSla(past20, "RESOLVED");
      expect(sla.isOverdue).toBe(false);
      expect(sla.alertTier).toBe("NORMAL");
      expect(sla.slaSeverity).toBe("green");
    });
  });

  describe("Monthly Compliance Reporting (Rule 19)", () => {
    it("computes the previous calendar month correctly", () => {
      const march = new Date("2026-03-15T12:00:00Z");
      expect(getPreviousMonthString(march)).toBe("2026-02");

      const jan = new Date("2026-01-10T12:00:00Z");
      expect(getPreviousMonthString(jan)).toBe("2025-12");
    });

    it("generates privacy-safe public disclosure without complainant PII", () => {
      const sampleMetrics: MonthlyComplianceMetrics = {
        month: "2026-08",
        periodStart: "2026-08-01",
        periodEnd: "2026-08-31",
        grievancesReceived: 4,
        grievancesAcknowledged: 4,
        grievancesResolved: 3,
        grievancesPending: 1,
        grievancesEscalatedLevelII: 0,
        grievancesEscalatedLevelIII: 0,
        actionsTakenCount: 2,
        advisoriesOrOrdersReceivedCount: 0,
        averageResolutionDays: 4.2,
        srbMembershipStatus: "LEVEL-II SRB MEMBERSHIP: PENDING EXTERNAL ACTION",
      };

      const md = buildPublicMonthlyDisclosureMarkdown(sampleMetrics);

      // Verify aggregate counts present
      expect(md).toContain("| **Grievances Received** | **4** |");
      expect(md).toContain("| **Grievances Acknowledged** | **4** |");
      expect(md).toContain("| **Grievances Resolved / Closed** | **3** |");
      expect(md).toContain("| **Grievances Pending Review** | **1** |");

      // Verify privacy notice present
      expect(md).toContain("statutory privacy principles, individual complainant identities");

      // Verify no complainant PII tokens
      expect(md).not.toContain("complainant@");
      expect(md).not.toContain("Ramesh");
      expect(md).not.toContain("complainant_name");
      expect(md).not.toContain("phone_number");
    });
  });

  describe("Rule 18 Publisher Information Package", () => {
    it("produces Form I particulars with verified entity info and explicit human-input markers", () => {
      const particulars = getRule18CanonicalParticulars();

      expect(particulars.formId).toBe("FORM_I_RULE_18");
      expect(particulars.publicationTitle).toBe("Jan Darpan");
      expect(particulars.legalEntityName).toBe("STRATXCEL SOLUTIONS (OPC) PRIVATE LIMITED");
      expect(particulars.cin).toBe("U70200CT2025OPC017739");
      expect(particulars.pan).toBe("REQUIRES HUMAN INPUT");
      expect(particulars.srbMembershipStatus).toBe("LEVEL-II SRB MEMBERSHIP: PENDING EXTERNAL ACTION");

      const doc = generateRule18DocumentMarkdown(particulars);
      expect(doc).toContain("FORM I — INFORMATION FURNISHING BY PUBLISHER");
      expect(doc).toContain("STRATXCEL SOLUTIONS (OPC) PRIVATE LIMITED");
      expect(doc).toContain("U70200CT2025OPC017739");
      expect(doc).toContain("REQUIRES HUMAN INPUT");
    });
  });
});
