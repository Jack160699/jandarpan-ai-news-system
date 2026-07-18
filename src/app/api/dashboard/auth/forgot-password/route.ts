import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";
import { getPublicSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import { checkLoginRateLimit } from "@/lib/security/brute-force";
import { getClientIp } from "@/lib/security/request-context";
import { rateLimitResponse } from "@/lib/security/rate-limit";
import { resolveCanonicalSiteUrl } from "@/lib/seo/canonical-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Request a password-reset email. Always returns a generic success message
 * to avoid account enumeration.
 */
export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, error: "email_required" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const rate = await checkLoginRateLimit(email, ip);
  if (!rate.allowed) {
    return rateLimitResponse(rate.retryAfterSec ?? 900);
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "auth_unavailable" }, { status: 503 });
  }

  const { url, anonKey } = getPublicSupabaseEnv();
  const siteUrl = resolveCanonicalSiteUrl().replace(/\/$/, "");
  const redirectTo = `${siteUrl}/admin/reset-password`;

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => [],
      setAll: () => undefined,
    },
  });

  try {
    await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  } catch {
    // Swallow — do not leak whether the account exists
  }

  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for that email, a password reset link has been sent.",
  });
}
