import { SignInPage } from "@/features/reader-ds/experience";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { pruneFeedForReader } from "@/lib/homepage/prune-reader-feed";
import { createSecurePreviewFeed } from "@/lib/homepage/secure-preview-feed";

export const dynamic = "force-dynamic";

/**
 * Mandatory Google-only authentication gate with 5-second newsroom preview.
 * Renders the actual Jan Darpan production interface behind controlled blur,
 * using securely sanitized data to guarantee 0% protected content leakage.
 */
export default async function LoginPage() {
  let feed = null;
  try {
    const raw = await getCachedGeneratedHomepageFeed();
    if (raw) {
      feed = createSecurePreviewFeed(pruneFeedForReader(raw));
    }
  } catch (err) {
    console.error("LoginPage feed load fallback:", err);
  }

  return <SignInPage feed={feed} />;
}
