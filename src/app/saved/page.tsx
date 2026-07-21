import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { redirect } from "next/navigation";

/** Alias for saved stories — canonical profile page is /archive */
export default function SavedRedirectPage() {
  redirect(isReaderDesignSystemEnabled() ? "/archive/saved" : "/archive#saved-stories");
}
