import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAnonServerClient,
  createCookieServerClient,
} from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getTenantConfig } from "@/lib/tenant/resolve";

export const runtime = "nodejs";

type FoundingStatus = {
  cap: number;
  active: boolean;
  claimed: number;
  remaining: number;
  message_hi: string | null;
  message_en: string | null;
};

type FoundingClaim = {
  ok: boolean;
  already?: boolean;
  position?: number;
  remaining?: number;
  reason?: string;
};

/** Live founding-offer counter — real DB state, cached briefly at the edge */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 200 });
  }
  try {
    const tenant = await getTenantConfig();
    const supabase = createAnonServerClient() as SupabaseClient;
    const { data, error } = await supabase.rpc("founding_offer_status", {
      p_tenant_id: tenant.id,
    });
    if (error || !data) {
      return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 200 });
    }
    const status = data as FoundingStatus;
    return NextResponse.json(
      { ok: true, ...status },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
        },
      }
    );
  } catch {
    return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 200 });
  }
}

/** Claim a founding membership — atomic and idempotent server-side */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  }
  try {
    const tenant = await getTenantConfig();
    const supabase = (await createCookieServerClient()) as SupabaseClient;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, reason: "auth_required" },
        { status: 401 }
      );
    }
    const { data, error } = await supabase.rpc("claim_founding_membership", {
      p_tenant_id: tenant.id,
    });
    if (error || !data) {
      return NextResponse.json(
        { ok: false, reason: "claim_failed" },
        { status: 500 }
      );
    }
    const claim = data as FoundingClaim;
    return NextResponse.json(claim, {
      status: claim.ok ? 200 : 409,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { ok: false, reason: "claim_failed" },
      { status: 500 }
    );
  }
}
