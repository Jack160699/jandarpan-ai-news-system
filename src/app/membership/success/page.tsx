import { PaymentSuccessPage } from "@/features/reader-ds/monetization";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createCookieServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: "Membership confirmed",
  description: "Your membership is active.",
  path: "/membership/success",
});

type Props = {
  searchParams: Promise<{ plan?: string; order?: string; until?: string }>;
};

/**
 * E40 — success only when the signed-in reader has an active subscription row.
 * Query params alone must never imply payment succeeded.
 */
export default async function MembershipSuccessRoute({ searchParams }: Props) {
  if (!isReaderDesignSystemEnabled()) redirect("/membership");

  if (!isSupabaseConfigured()) {
    redirect("/membership/failure?reason=unverified");
  }

  try {
    const supabase = await createCookieServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      redirect("/membership/failure?reason=unverified");
    }

    const { data: sub } = await supabase
      .from("reader_subscriptions")
      .select("status")
      .eq("email", user.email)
      .eq("status", "active")
      .maybeSingle();

    if (!sub) {
      redirect("/membership/failure?reason=unverified");
    }
  } catch {
    redirect("/membership/failure?reason=unverified");
  }

  const { plan, order, until } = await searchParams;
  return (
    <PaymentSuccessPage
      planLabel={plan ?? null}
      orderId={order ?? null}
      validUntil={until ?? null}
    />
  );
}
