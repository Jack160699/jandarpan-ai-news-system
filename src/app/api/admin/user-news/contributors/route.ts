import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-authorization";
import { createAdminServerClient } from "@/lib/supabase";
import { buildContributors, type ProfileStub, type SubmissionStub, type VerificationStub } from "@/lib/user-news/contributors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SUBMISSIONS = 5000;

/** GET — contributors with their verification RESULT and story outcomes. Moderators and super-admins only; never returns identity data or emails. */
export async function GET(request: Request) {
  const auth = await requireAdminPermission(request, "publish:write");
  if (!auth.ok) return auth.response;
  // The generated Database type does not know the user-news tables yet; rows are shaped by buildContributors.
  const db = createAdminServerClient() as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

  const subs = await db.from("user_news_submissions").select("author_id,status,created_at,published_at").order("created_at", { ascending: false }).limit(MAX_SUBMISSIONS);
  if (subs.error) return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const submissions = (subs.data ?? []) as SubmissionStub[];
  const ids = [...new Set(submissions.map((s) => s.author_id))].slice(0, 1000);

  const [profiles, verifications] = ids.length
    ? await Promise.all([
        db.from("reader_profiles").select("user_id,display_name").in("user_id", ids),
        db.from("user_verification").select("user_id,status,provider,verified_at,expires_at").in("user_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  const contributors = buildContributors({ submissions, profiles: (profiles.data ?? []) as ProfileStub[], verifications: (verifications.data ?? []) as VerificationStub[] });
  return NextResponse.json({ ok: true, contributors, truncated: submissions.length >= MAX_SUBMISSIONS }, { headers: { "Cache-Control": "private, no-store" } });
}
