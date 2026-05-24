import { cookies } from "next/headers";
import { sectionsFromFeedInterests } from "@/lib/super-menu/interest-sections";
import type { HomeSectionId } from "@/lib/homepage/types";

const COOKIE = "cgb-feed-interests";

export async function getServerFeedInterestIds(): Promise<string[]> {
  try {
    const jar = await cookies();
    const raw = jar.get(COOKIE)?.value;
    if (!raw) return [];
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export async function getServerPreferredSections(): Promise<HomeSectionId[]> {
  const ids = await getServerFeedInterestIds();
  return sectionsFromFeedInterests(ids);
}
