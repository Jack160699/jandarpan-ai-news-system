import { createHash } from "crypto";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";

export function contentHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function findDuplicateAsset(input: {
  tenantId: string;
  hash: string;
  excludeId?: string;
}): Promise<{ id: string; name: string; publicUrl: string } | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();
  let q = supabase
    .from("dam_assets")
    .select("id, name, public_url")
    .eq("tenant_id", input.tenantId)
    .eq("content_hash", input.hash)
    .limit(1);

  if (input.excludeId) q = q.neq("id", input.excludeId);

  const { data } = await q.maybeSingle();
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    publicUrl: data.public_url,
  };
}
