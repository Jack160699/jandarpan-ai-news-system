import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { signInWithPassword } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        ok: false,
        error: "configure_supabase",
        message: "Set Supabase env vars and create a tenant membership for login.",
      });
    }
    return NextResponse.json({ ok: false, error: "auth_unavailable" }, { status: 503 });
  }

  const email = body.email?.trim();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "email_password_required" },
      { status: 400 }
    );
  }

  const result = await signInWithPassword(email, password);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    email: result.user.email,
    userId: result.user.id,
  });
}
