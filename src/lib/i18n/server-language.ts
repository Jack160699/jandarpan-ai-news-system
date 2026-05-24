import { cookies } from "next/headers";
import { LANGUAGE_STORAGE_KEY, isAppLanguage } from "@/lib/i18n/storage";
import type { NewsroomLanguage } from "@/lib/i18n/languages";

export async function getServerReaderLanguage(): Promise<NewsroomLanguage> {
  const jar = await cookies();
  const raw = jar.get(LANGUAGE_STORAGE_KEY)?.value;
  if (isAppLanguage(raw)) return raw;
  return "en";
}
