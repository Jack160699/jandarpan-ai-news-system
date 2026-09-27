import { SignInPage } from "@/features/reader-ds/experience";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { pruneFeedForReader } from "@/lib/homepage/prune-reader-feed";

export const revalidate = 60;

/**
 * Mandatory Google-only authentication gate with 5-second newsroom preview.
 * Fetches real production feed server-side to power the authentic blurred preview.
 */
export default async function LoginPage() {
  let feed = null;
  try {
    const raw = await getCachedGeneratedHomepageFeed();
    if (raw) {
      feed = pruneFeedForReader(raw);
    }
  } catch (err) {
    console.error("LoginPage feed load fallback:", err);
  }

  return <SignInPage feed={feed} />;
}
