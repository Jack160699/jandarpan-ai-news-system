import { NextResponse } from "next/server";
import { signOut } from "@/lib/supabase/auth";

export async function POST() {
  await signOut();
  return NextResponse.json({ ok: true });
}
