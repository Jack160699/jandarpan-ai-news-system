import { NextResponse } from "next/server";
import { createCookieServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  applyCustomDisplayName,
  validateAvatarUpload,
  type ReaderEditableProfile,
} from "@/lib/auth/reader-profile";
import {
  fetchOwnReaderProfile,
  rowToEditable,
  updateOwnReaderProfile,
} from "@/lib/auth/reader-profile-remote";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

/**
 * GET /api/reader/profile — own profile under RLS.
 * PATCH — update display name / district / language (authorized self only).
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const supabase = await createCookieServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  const row = await fetchOwnReaderProfile(supabase, user.id);
  return NextResponse.json({
    ok: true,
    profile: row ? rowToEditable(row) : null,
    email: user.email ?? null,
  });
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const supabase = await createCookieServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  let body: {
    displayName?: string;
    homeDistrict?: string | null;
    language?: string | null;
    districtExplicit?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const existing = await fetchOwnReaderProfile(supabase, user.id);
  let base: ReaderEditableProfile = existing
    ? rowToEditable(existing)
    : {
        displayName: "Reader",
        avatarUrl: null,
        displayNameCustomized: false,
        avatarCustomized: false,
        homeDistrict: null,
        language: null,
        districtExplicit: false,
      };

  if (typeof body.displayName === "string") {
    base = applyCustomDisplayName(base, body.displayName);
  }
  if (body.homeDistrict !== undefined) {
    base = {
      ...base,
      homeDistrict: body.homeDistrict,
      districtExplicit:
        body.districtExplicit !== undefined
          ? Boolean(body.districtExplicit)
          : true,
    };
  }
  if (body.language !== undefined) {
    base = { ...base, language: body.language };
  }

  const result = await updateOwnReaderProfile(supabase, user.id, base);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, profile: result.profile });
}

/** Avatar validation helper endpoint — upload itself goes through storage with RLS. */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const supabase = await createCookieServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });
  }

  const validated = validateAvatarUpload({ type: file.type, size: file.size });
  if (!validated.ok) {
    return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
  }

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/avatar.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("reader-avatars")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { ok: false, error: uploadError.message, hint: "bucket_or_migration_pending" },
      { status: 502 }
    );
  }

  const { data: pub } = supabase.storage.from("reader-avatars").getPublicUrl(path);
  const avatarUrl = `${pub.publicUrl}?v=${Date.now()}`;

  const result = await updateOwnReaderProfile(supabase, user.id, {
    avatarUrl,
    avatarCustomized: true,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, profile: result.profile, avatarUrl });
}
