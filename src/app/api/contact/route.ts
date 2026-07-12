import { NextResponse } from "next/server";
import { fetchOrganizationSettings } from "@/lib/organization/settings";
import { checkPublicApiRateLimit } from "@/lib/security/public-rate-limit";
import { isContactHoneypotTriggered } from "@/lib/security/contact-abuse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const rate = await checkPublicApiRateLimit(request, "contact", 5, 3600);
  if (!rate.allowed) {
    return rate.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const p = body as {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
    website?: string;
    company_url?: string;
    _hp?: string;
    url?: string;
  };

  if (isContactHoneypotTriggered(p as Record<string, unknown>)) {
    return NextResponse.json({
      ok: true,
      message: "Thank you. Our editorial team will respond shortly.",
    });
  }

  const name = p.name?.trim() ?? "";
  const email = p.email?.trim() ?? "";
  const subject = p.subject?.trim() ?? "General inquiry";
  const message = p.message?.trim() ?? "";

  if (!name || name.length < 2) {
    return NextResponse.json({ ok: false, error: "invalid_name" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  if (!message || message.length < 10) {
    return NextResponse.json({ ok: false, error: "invalid_message" }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ ok: false, error: "message_too_long" }, { status: 400 });
  }

  const org = await fetchOrganizationSettings();
  const recipient = org.email || org.editorialEmail;

  if (process.env.NODE_ENV === "development") {
    console.info("[contact]", { name, email, subject, recipient, messageLength: message.length });
  }

  return NextResponse.json({
    ok: true,
    message: "Thank you. Our editorial team will respond shortly.",
  });
}
