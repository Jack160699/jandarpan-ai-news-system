import type { MyNewsItem } from "@/lib/user-news/service";
import type { Deps } from "@/lib/user-news/types";

/** Replaces each item's private thumbnail PATH with a short-lived signed URL (the bucket is private; readers never see a raw path). */
export async function createMediaReadUrls(deps: Deps, items: MyNewsItem[]): Promise<Array<Omit<MyNewsItem, "thumbnailPath"> & { thumbnailUrl: string | null }>> {
  return Promise.all(
    items.map(async ({ thumbnailPath, ...rest }) => ({
      ...rest,
      thumbnailUrl: thumbnailPath ? await deps.storage.signedReadUrl(thumbnailPath, 900).catch(() => null) : null,
    }))
  );
}
