import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { signInWithPassword } from "@/lib/supabase/auth";
import { isAdminAuthorized } from "@/lib/editorial-dashboard/auth";
import { ACCESS_COOKIE } from "@/lib/saas-auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: string; password?: string; devKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (body.devKey && isAdminAuthorized(body.devKey)) {
    const res = NextResponse.json({
      ok: true,
      mode: "dev_admin",
      email: process.env.DASHBOARD_DEV_EMAIL ?? "admin@newsroom.local",
    });
    res.cookies.set(ACCESS_COOKIE, "dev-admin", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "development") {
      const res = NextResponse.json({ ok: true, mode: "dev" });
      res.cookies.set(ACCESS_COOKIE, "dev", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
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
