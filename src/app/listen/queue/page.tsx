import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { AudioQueuePage } from "@/features/reader-ds/experience";
import { loadListenTracks } from "@/features/reader-ds/experience/loadListenTracks";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { buildHubPageMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";

export const metadata = buildHubPageMetadata({
  title: "Audio queue",
  description: "Playback queue and speed settings for Jan Darpan audio briefing.",
  path: "/listen/queue",
});

export default async function ListenQueueRoute() {
  if (!isReaderDesignSystemEnabled()) redirect("/listen");
  const tracks = await loadListenTracks();
  return (
    <>
      <JsonLdScript
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Audio queue",
          url: "/listen/queue",
        }}
      />
      <AudioQueuePage tracks={tracks} />
    </>
  );
}
