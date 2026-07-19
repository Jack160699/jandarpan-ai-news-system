import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { DownloadsPage } from "@/features/reader-ds/experience";
import { loadListenTracks } from "@/features/reader-ds/experience/loadListenTracks";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { buildHubPageMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";

export const metadata = buildHubPageMetadata({
  title: "Downloaded audio",
  description: "Offline audio downloads for Jan Darpan briefing.",
  path: "/listen/downloads",
});

export default async function ListenDownloadsRoute() {
  if (!isReaderDesignSystemEnabled()) redirect("/listen");
  const tracks = await loadListenTracks();
  return (
    <>
      <JsonLdScript
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Downloaded audio",
          url: "/listen/downloads",
        }}
      />
      <DownloadsPage tracks={tracks} />
    </>
  );
}
