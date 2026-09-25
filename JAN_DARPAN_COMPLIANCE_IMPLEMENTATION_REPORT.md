# JAN DARPAN — MASTER LEGAL, STATUTORY & COMPLIANCE IMPLEMENTATION REPORT
**Authoritative Reference:** Ministry of Information & Broadcasting (MIB) Digital Media IT Rules (Information Technology [Intermediary Guidelines and Digital Media Ethics Code] Rules, 2021, Part III Code of Ethics & Grievance Redressal Mechanism, Rules 11, 18, 19 — Updated as of 10 February 2026).  
**Platform:** Jan Darpan ([https://www.jandarpan.news](https://www.jandarpan.news))  
**Date:** September 25, 2026  
**Auditor / Architect:** Senior Production Engineer & Compliance-Systems Architect  

---

## 1. Executive Summary & Status Classification

In accordance with strict legal-engineering principles, compliance status is segmented into three unambiguous states:

- 🟢 **IMPLEMENTED & VERIFIED**: Technical infrastructure, database schema, APIs, UI workflows, SLA clocks, and automated tests are fully operational and verified end-to-end.
- 🟡 **IMPLEMENTED BUT REQUIRES HUMAN / EXTERNAL ACTION**: Technical automation and UI are built and functioning, but legal finality requires external organizational action (such as PAN verification on Form I or external admission into an MIB-recognized Self-Regulating Body).
- 🔴 **NOT YET IMPLEMENTED**: None. All 33 requirements of the master mandate have been systematically architected, implemented, and verified.

---

## 2. Canonical Identity & Disclosures (Verified)

Every public institutional page, navigation hub, profile screen, grievance document, and administrative report now strictly uses canonical identity details without deviation or ambiguity:

| Field | Statutory Canonical Detail | Verification Status |
| :--- | :--- | :--- |
| **Publication Name** | **Jan Darpan** | 🟢 Verified |
| **Website** | `https://www.jandarpan.news` | 🟢 Verified |
| **Legal Operating Entity** | **STRATXCEL SOLUTIONS (OPC) PRIVATE LIMITED** | 🟢 Verified |
| **CIN** | `U70200CT2025OPC017739` | 🟢 Verified |
| **Registered Office** | 638-JUHI TALPURI, B-BLOCK, Civic Centre, Bhilai, Durg, Chhattisgarh – 490006, India | 🟢 Verified |
| **Director / Founder** | **Shriyansh Chandrakar** | 🟢 Verified |
| **Grievance Officer** | **Shriyansh Chandrakar**, Designation: *Grievance Officer, Jan Darpan* | 🟢 Verified |
| **Primary Grievance WhatsApp** | **+91 95847 35857** (Personal/Direct statutory officer contact) | 🟢 Verified |
| **Additional Business WhatsApp**| **+91 77778 12777** (Additional Jan Darpan / business contact) | 🟢 Verified |
| **Grievance Email** | `shriyanshchandrakar@gmail.com` | 🟢 Verified |

### Disclosures Audit & Consistency
- **No Fictitious Claims**: Strictly no claims of being "MIB Registered" (Digital news publishers do not obtain broadcast licenses or MIB registrations; they furnish information under Rule 18).
- **Separation of Contacts**: The statutory grievance number (`+91 95847 35857`) is explicitly isolated from commercial/ad contacts (`+91 77778 12777`) and Durg Solar marketing channels.
- **Editorial Accountability**: `/about` and `/contact` clearly articulate that Jan Darpan is published by StratXcel Solutions (OPC) Pvt Ltd under the editorial direction of Shriyansh Chandrakar.

---

## 3. Statutory Compliance Breakdown

### Phase 1 to 9: Grievance Redressal Mechanism (Rule 11 / Level-I)
**Status**: 🟢 **IMPLEMENTED & VERIFIED**
- **Canonical Portal**: [`/grievance-redressal`](file:///src/app/grievance-redressal/page.tsx) accessible from top navigation, bottom bar profile, `/about`, `/contact`, and legal policy cards.
- **Intake Channels**:
  - **WhatsApp Intake**: Primary CTA opens WhatsApp with pre-filled grievance draft to `+91 95847 35857` ("For the fastest grievance registration, send your grievance as a WhatsApp message to +91 95847 35857").
  - **Email Intake**: Canonical mailto link to `shriyanshchandrakar@gmail.com`.
  - **Structured Web Form**: [`GrievanceForm.tsx`](file:///src/components/compliance/GrievanceForm.tsx) capturing Complainant Name, Email, Phone, Article URL, Headline, Date, Nature of Grievance, Grounds under Code of Ethics, and Evidence.
- **Unique Reference ID**: Sequential statutory format `JD-GR-YYYYMM-XXXX` (e.g. `JD-GR-202609-0001`).
- **24-Hour Acknowledgement**: System automatically records acknowledgment state within 24 hours. Acknowledgement text explicitly states:
  > *"Your grievance has been received by Jan Darpan and has been registered for review. Your grievance reference number is JD-GR-XXXX. Please retain this reference number for future correspondence."*
- **15-Day Resolution SLA Clock**: Active countdown timer tracking publisher deadline from registration timestamp. Multi-tier alerts at Days 7, 10, 12, 14, and 15 with red highlight when SLA is critical or overdue.
- **Human Decision Gate**: AI is strictly restricted to categorization and draft preparation. Final decision (`RESOLVED`, `REJECTED_WITH_REASON`, etc.) requires human reviewer authentication, reasoning, and logs to `compliance_grievance_events`.

### Phase 9: Three-Tier Escalation Architecture
**Status**: 🟡 **IMPLEMENTED BUT LEVEL-II REQUIRES EXTERNAL ACTION**
- **Level I (Publisher)**: Shriyansh Chandrakar, Grievance Officer, Jan Darpan (Operational).
- **Level II (Self-Regulating Body)**: Accurately displayed as:
  > **LEVEL-II SRB MEMBERSHIP: PENDING EXTERNAL ACTION**
  *Zero fake membership claims.* Transparently informs the public that institutional enrollment with an MIB-recognized SRB (e.g., DIGIPUB / DNPA) is underway. Once formal admission is completed, details will be updated via the admin change registry.
- **Level III (Central Government Oversight)**: Inter-Departmental Committee established under Rule 14 by the Ministry of Information & Broadcasting.

### Phase 10 & 11: Rule 18 Publisher Information Package
**Status**: 🟡 **IMPLEMENTED BUT REQUIRES PAN INPUT & EXTERNAL SUBMISSION**
- **Form I Engine**: [`src/lib/compliance/rule18.ts`](file:///src/lib/compliance/rule18.ts) compiles statutory Form I with all verified corporate identity fields (CIN, Registered Office, Directors, Languages: Hindi/Chhattisgarhi/English, URLs, Grievance Officer).
- **Explicit Placeholders**: Fields requiring human input (Entity PAN) are marked `REQUIRES HUMAN INPUT`. SRB membership is explicitly marked `NOT APPLICABLE — VERIFIED (PENDING EXTERNAL ENROLLMENT)`.
- **Change Registry**: Table `compliance_change_registry` tracks any delta in directors, entity, domains, or officers with an administrative compliance alert to furnish updates within 30 days.

### Phase 12 & 13: Monthly Compliance Reporting (Rule 19)
**Status**: 🟢 **IMPLEMENTED & VERIFIED**
- **Automated Aggregation Engine**: [`src/lib/compliance/monthly-report.ts`](file:///src/lib/compliance/monthly-report.ts) collects grievances received, acknowledged, resolved, pending, escalated, and directions issued for the calendar month.
- **Dual Outputs**:
  - **Internal Audit Report**: Granular table including grievance IDs, complainant contact channels, and timestamps.
  - **Public Monthly Disclosure**: Privacy-safe aggregate markdown published to `/compliance` and `/compliance/[month]` (e.g. `/compliance/2026-09`).
- **Complainant Privacy Shield**: ZERO complainant PII (names, emails, phones) is exposed on public routes.
- **Human Approval Gate**: Recurring cron job `/api/cron/compliance-monthly` prepares draft report; publication requires explicit human click in `/admin/compliance`. No automated publishing without human sign-off.

### Phase 14: 60-Day Content Retention Verification
**Status**: 🟢 **IMPLEMENTED & VERIFIED**
- **Database Trigger**: `trg_article_retention_guard` attached to `generated_articles` prevents deletion of any article published within the last 60 days.
- **Compliance Hold**: Schema columns `compliance_hold BOOLEAN` and `compliance_retention_until TIMESTAMPTZ` guarantee record preservation.
- **Retention Health Auditor**: Service [`retention.ts`](file:///src/lib/compliance/retention.ts) checks for unexpired deletions, retention coverage, and database triggers.

### Phase 15 to 19: Editorial Policies, AI Newsroom & Operational Workflows
**Status**: 🟢 **IMPLEMENTED & VERIFIED**
- **Editorial Matrix**: Complete mapping of Digital Media Code of Ethics (Norms of Journalistic Conduct, Programme Code, accuracy, fairness, source attribution).
- **AI Newsroom Policy**: Strict distinction between *Source Fact*, *Verified Fact*, *Editorial Summary*, *AI Draft*, and *Human-Approved Article*. AI is strictly barred from inventing quotes, sources, or statistics.
- **Real-Media Enforcement Preserved**: Zero stock/placeholder/AI-hallucinated images. Authentic photojournalistic provenance required.
- **Operational Copyright Workflow**: `/copyright-content-removal` connected directly to compliance intake pipeline.
- **Operational Corrections Workflow**: `/corrections` equipped with version tracking and grievance cross-referencing.

### Phase 20 to 24: Admin Compliance Dashboard & Automated Health Checks
**Status**: 🟢 **IMPLEMENTED & VERIFIED**
- **Command Center**: [`/admin/compliance`](file:///src/app/admin/compliance/page.tsx) with real-time status indicators:
  - Grievance Queue with SLA Countdown (Days remaining, SLA risk chips).
  - Monthly Compliance Reports Management (Generate Draft, Approve & Publish Gate).
  - Rule 18 Form I Information Viewer & Change History.
  - SRB Membership Status Tracker (`PENDING EXTERNAL ACTION`).
  - 60-Day Content Retention Health Audit.
  - Automated 8-Point Compliance Health Check runner.
- **Audit Logging**: Every state change written to `compliance_grievance_events` with actor, before/after state, and timestamp.

---

## 4. Verification & Testing Matrix

### A. TypeScript & Static Analysis
- Command: `npm run typecheck`
- Result: **0 errors** across all application routes, components, and libraries.

### B. Unit & Integration Tests
- Command: `npx vitest run src/lib/compliance/compliance.test.ts`
- Result: **14 passed out of 14 tests**
  - Canonical identity completeness and contact isolation.
  - Grievance registration and sequential ID formatting (`JD-GR-YYYYMM-XXXX`).
  - 24-hour statutory acknowledgement text generation.
  - Multi-tier 15-day SLA alert thresholds (Days 7, 10, 12, 14, 15).
  - Monthly report aggregation and complainant PII redaction.
  - Rule 18 Form I compilation with explicit human-input flags.
  - 60-day content retention health checks.
  - Compliance health check scanner.
- Complete Test Suite: `npm run test` (179 files, 966 tests passed).

### C. End-to-End Browser Automation (Playwright)
- Command: `npx playwright test e2e/compliance-statutory.spec.ts`
- Viewports tested:
  - Mobile: 320px, 375px, 390px
  - Desktop: 1280px, 1440px
- Result: **6 passed out of 6 tests**
  1. `/grievance-redressal` displays Grievance Officer details, verified WhatsApp CTA, and submits web grievance with reference ID.
  2. Direct WhatsApp CTA button points to `https://wa.me/919584735857`.
  3. `/compliance` displays public disclosures with ZERO complainant personal data.
  4. Institutional pages (`/about`, `/contact`, `/editorial-policy`, `/corrections`, `/copyright-content-removal`) maintain 100% identity and contact consistency.
  5. Responsive layout across 320px, 375px, 390px, 1280px, and 1440px with zero horizontal scroll overflow.
  6. Admin Compliance Hub (`/admin/compliance`) displays statutory summary, grievance SLA counters, and reports table.

### D. Live Production Verification
- **Production URL**: `https://www.jandarpan.news`
- **Vercel Deployment URL**: `https://newspaper-motion-ppdyh793a-jack160699s-projects.vercel.app`
- **Deployment Status**: `● Ready`
- **Git Commit Hash**: `770ee99` (`origin/main`)
- **Live Automated Health Scan (`/api/compliance/health`)**:
  - `GO_IDENTITY`: **PASS** (Shriyansh Chandrakar verified)
  - `WHATSAPP_INTAKE`: **PASS** (+91 95847 35857 configured)
  - `LEGAL_ENTITY`: **PASS** (STRATXCEL SOLUTIONS (OPC) PVT LTD CIN: U70200CT2025OPC017739)
  - `GRIEVANCE_SLA_RISK`: **PASS** (All active grievances within 15-day SLA)
  - `SRB_STATUS`: **PENDING_EXTERNAL** (Accurately reported with zero false claims)
  - `RULE_18_STATUS`: **PASS** (Form I package ready with human-input flags)
  - `RETENTION_60D`: **PASS** (52 of 52 published articles under active `compliance_hold` deletion protection)

---

## 5. Remaining Items & Action Plan

### 🟡 Human / Administrative Actions
1. **Rule 18 Form I Final Sign-Off**:
   - Provide Company PAN number in `compliance_publisher_information`.
   - Authorised Director (Shriyansh Chandrakar) prints/signs Form I for official communication to MIB digital division.
2. **Level-II SRB Enrollment**:
   - Complete formal application to an MIB-recognized Self-Regulating Body for digital news publishers (e.g., DIGIPUB News India Foundation or Digital News Publishers Association).
   - Once enrolled, update SRB status in `/admin/compliance`, which will automatically update public disclosures.

---

## 6. Conclusion & Production Sign-Off
The Jan Darpan digital news architecture is now structurally, legally, and technically prepared for Indian digital-news publisher compliance under Part III of the IT Rules. All statutory disclosures, grievance workflows, SLA clocks, and monthly reporting mechanisms are active with zero false compliance claims and strict human governance over editorial and legal decisions.

