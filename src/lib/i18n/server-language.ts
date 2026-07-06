import { cookies } from "next/headers";
import {
  LANGUAGE_CHOSEN_COOKIE,
  LANGUAGE_STORAGE_KEY,
} from "@/lib/i18n/storage";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { isReaderLanguage } from "@/lib/i18n/reader-languages";

export async function getServerReaderLanguage(
  fallback: NewsroomLanguage = "hi"
): Promise<NewsroomLanguage> {
  const jar = await cookies();
  const chosen = jar.get(LANGUAGE_CHOSEN_COOKIE)?.value === "1";
  if (!chosen) {
    return isReaderLanguage(fallback) ? fallback : "hi";
  }
  const raw = jar.get(LANGUAGE_STORAGE_KEY)?.value;
  if (isReaderLanguage(raw)) return raw;
  return isReaderLanguage(fallback) ? fallback : "hi";
}
