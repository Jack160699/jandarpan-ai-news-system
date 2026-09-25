import { NextResponse } from "next/server";
import { createGrievance, type GrievanceSubmissionInput } from "@/lib/compliance/grievance-service";
import { checkPublicApiRateLimit } from "@/lib/security/public-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rate = await checkPublicApiRateLimit(request, "compliance_grievance", 10, 3600);
  if (!rate.allowed) {
    return rate.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const p = body as Record<string, any>;

  const complainantName = (p.complainantName ?? p.name ?? "").trim();
  const complainantEmail = (p.complainantEmail ?? p.email ?? "").trim();
  const complainantPhone = (p.complainantPhone ?? p.phone ?? "").trim();
  const articleUrl = (p.articleUrl ?? p.url ?? "").trim();
  const articleHeadline = (p.articleHeadline ?? p.headline ?? "").trim();
  const publicationDate = (p.publicationDate ?? "").trim();
  const natureOfGrievance = (p.natureOfGrievance ?? p.nature ?? "").trim();
  const groundsOfGrievance = (p.groundsOfGrievance ?? p.grounds ?? p.message ?? "").trim();
  const codeOfEthicsClause = (p.codeOfEthicsClause ?? p.ethicsClause ?? "").trim();
  const supportingInfo = (p.supportingInfo ?? "").trim();
  const consentGiven = Boolean(p.consentGiven ?? p.consent);
  const channel = (["web", "whatsapp", "email"].includes(p.channel) ? p.channel : "web") as "web" | "whatsapp" | "email";

  // Validate required fields
  if (!complainantName || complainantName.length < 2) {
    return NextResponse.json({ ok: false, error: "complainant_name_required" }, { status: 400 });
  }

  if (!complainantEmail && !complainantPhone) {
    return NextResponse.json(
      { ok: false, error: "contact_information_required", message: "Please provide either an email address or a phone/WhatsApp number for statutory correspondence." },
      { status: 400 }
    );
  }

  if (!natureOfGrievance || natureOfGrievance.length < 3) {
    return NextResponse.json({ ok: false, error: "nature_of_grievance_required" }, { status: 400 });
  }

  if (!groundsOfGrievance || groundsOfGrievance.length < 10) {
    return NextResponse.json({ ok: false, error: "grounds_of_grievance_detailed_explanation_required" }, { status: 400 });
  }

  if (!consentGiven) {
    return NextResponse.json({ ok: false, error: "statutory_consent_required" }, { status: 400 });
  }

  const submissionInput: GrievanceSubmissionInput = {
    channel,
    complainantName,
    complainantEmail: complainantEmail || undefined,
    complainantPhone: complainantPhone || undefined,
    articleUrl: articleUrl || undefined,
    articleHeadline: articleHeadline || undefined,
    publicationDate: publicationDate || undefined,
    natureOfGrievance,
    groundsOfGrievance,
    codeOfEthicsClause: codeOfEthicsClause || undefined,
    supportingInfo: supportingInfo || undefined,
    consentGiven: true,
  };

  const result = await createGrievance(submissionInput);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error ?? "failed_to_register_grievance" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    grievanceId: result.grievanceId,
    acknowledgementText: result.acknowledgementText,
    slaTimeline: {
      acknowledgement: "Within 24 hours (Acknowledged)",
      resolutionTarget: "15 calendar days from registration",
      grievanceOfficer: "Shriyansh Chandrakar",
      contact: "shriyanshchandrakar@gmail.com / +91 95847 35857",
    },
  });
}
