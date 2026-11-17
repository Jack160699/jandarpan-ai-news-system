import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { Masthead, ReaderShell } from "@/features/reader-ds/components";
import { ReaderLivePage } from "@/features/reader-ds/live/ReaderLivePage";
import { EmptyState } from "@/features/reader-ds/system";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { pruneFeedForReader } from "@/lib/homepage/prune-reader-feed";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { BRAND } from "@/lib/brand";
import {
  breadcrumbListJsonLd,
  buildHubPageMetadata,
  collectionPageJsonLd,
} from "@/lib/seo";
import { buildHomeBreadcrumb } from "@/lib/seo/breadcrumbs";

export const revalidate = 60;

const BASE_TITLE = `Jan Darpan Live · ${BRAND.nameEn}`;
const BASE_DESCRIPTION =
  "Jan Darpan Live — AI-powered 24/7 newsroom with a virtual anchor, breaking news, and continuous Chhattisgarh coverage.";
const BASE_PATH = "/live";

export const metadata = buildHubPageMetadata({
  title: BASE_TITLE,
  description: BASE_DESCRIPTION,
  path: BASE_PATH,
  keywords: [
    "jan darpan live",
    "live news chhattisgarh",
    "AI newsroom",
    "breaking news",
    "जन दर्पण लाइव",
    "छत्तीसगढ़ लाइव न्यूज़",
    "virtual anchor",
  ],
});

export default async function LivePage() {
  const [feed, readerLanguage] = await Promise.all([
    getCachedGeneratedHomepageFeed(),
    getServerReaderLanguage(),
  ]);

  if (isReaderDesignSystemEnabled()) {
    if (feed) {
      return <ReaderLivePage feed={pruneFeedForReader(feed)} />;
    }
    return (
      <ReaderShell activeNav="live" showDeskFooter={false} bottomPad={0} reserveMiniPlayer={false}>
        <Masthead />
        <EmptyState
          title={
            readerLanguage === "hi"
              ? "अभी कोई ताज़ा प्रसारण उपलब्ध नहीं है"
              : "No live broadcast available right now"
          }
          body={
            readerLanguage === "hi"
              ? "नया सत्यापित समाचार प्रसारित होते ही यहाँ लाइव दिखाई देगा।"
              : "Verified coverage will appear here live as soon as it is broadcast."
          }
          primaryLabel={readerLanguage === "hi" ? "मुख्य पृष्ठ देखें" : "Go to home"}
          primaryHref="/home"
        />
      </ReaderShell>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Jan Darpan Live</h1>
    </div>
  );
}

