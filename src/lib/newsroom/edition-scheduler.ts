import { createAdminServerClient } from "@/lib/supabase";
import { publishGeneratedArticle } from "@/lib/editorial/publication";
import { EDITORIAL_CAPACITY } from "@/lib/newsroom/editorial-capacity";

export type EditionPublishSlot =
  | "06:00"
  | "09:00"
  | "12:00"
  | "15:00"
  | "18:00"
  | "21:00";

const IST_TZ = "Asia/Kolkata";
const SLOT_HOURS: Record<EditionPublishSlot, number> = {
  "06:00": 6,
  "09:00": 9,
  "12:00": 12,
  "15:00": 15,
  "18:00": 18,
  "21:00": 21,
};

function getIstHourMinute(now = new Date()): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour, minute };
}

export function resolveEditionPublishSlot(
  now = new Date()
): { ok: true; slot: EditionPublishSlot } | { ok: false; reason: string } {
  const { hour, minute } = getIstHourMinute(now);
  if (minute !== 0) return { ok: false, reason: "outside_slot_minute" };

  const slot = (Object.keys(SLOT_HOURS) as EditionPublishSlot[]).find(
    (s) => SLOT_HOURS[s] === hour
  );
  if (!slot) return { ok: false, reason: "outside_slot_hour" };
  return { ok: true, slot };
}

export function resolveEditionPublishLimit(slot: EditionPublishSlot): number {
  // Capacity model: 06:00 + 09:00 split the morning edition budget.
  // This keeps daily total == sum(editions) and matches six publish windows.
  if (slot === "06:00" || slot === "09:00") {
    return Math.max(1, Math.floor(EDITORIAL_CAPACITY.editions.morning / 2));
  }
  if (slot === "12:00") return EDITORIAL_CAPACITY.editions.noon;
  if (slot === "15:00") return EDITORIAL_CAPACITY.editions.afternoon;
  if (slot === "18:00") return EDITORIAL_CAPACITY.editions.evening;
  return EDITORIAL_CAPACITY.editions.night;
}

export type EditionPublishResult = {
  ok: boolean;
  slot?: EditionPublishSlot;
  limit: number;
  published: number;
  attempted: number;
  errors: string[];
  reason?: string;
};

export async function publishScheduledForCurrentEdition(
  now = new Date()
): Promise<EditionPublishResult> {
  const slot = resolveEditionPublishSlot(now);
  if (!slot.ok) {
    return {
      ok: true,
      limit: 0,
      published: 0,
      attempted: 0,
      errors: [],
      reason: slot.reason,
    };
  }

  const limit = resolveEditionPublishLimit(slot.slot);
  const supabase = createAdminServerClient();

  // "Ready For Publish" = workflow_status=scheduled and no published_at yet.
  const { data: rows, error } = await supabase
    .from("generated_articles")
    .select("id,tenant_id")
    .eq("workflow_status", "scheduled")
    .is("published_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return {
      ok: false,
      slot: slot.slot,
      limit,
      published: 0,
      attempted: 0,
      errors: [error.message],
    };
  }

  const candidates = rows ?? [];
  let published = 0;
  const errors: string[] = [];

  for (const row of candidates) {
    const tenantId = row.tenant_id as string | null;
    if (!tenantId) {
      errors.push(`${row.id}:tenant_id_missing`);
      continue;
    }
    const result = await publishGeneratedArticle(row.id as string, tenantId);
    if (result.ok) published += 1;
    else errors.push(`${row.id}:${result.message ?? "publish_failed"}`);
  }

  return {
    ok: errors.length === 0,
    slot: slot.slot,
    limit,
    published,
    attempted: candidates.length,
    errors,
  };
}

