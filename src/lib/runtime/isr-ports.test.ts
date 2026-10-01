import { describe, expect, it } from "vitest";
import { ISR_PATHS as nextPaths, ISR_TAGS as nextTags } from "@/lib/infrastructure/cache/isr";
import { ISR_PATHS as edgePaths, ISR_TAGS as edgeTags, revalidateNewsroomCaches } from "./isr.edge";

describe("ISR runtime ports stay in sync", () => {
  it("the Edge copy of the tag/path constants equals the Next module's", () => {
    expect(edgeTags).toEqual(nextTags);
    expect(edgePaths).toEqual(nextPaths);
  });

  it("Edge revalidation never throws and is a no-op without configuration", async () => {
    const saved = { s: process.env.CRON_SCHEDULER_SECRET, b: process.env.APP_BASE_URL, u: process.env.NEXT_PUBLIC_SITE_URL };
    delete process.env.CRON_SCHEDULER_SECRET;
    delete process.env.APP_BASE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    await expect(revalidateNewsroomCaches({ publishedStories: 3 })).resolves.toBeUndefined();
    Object.assign(process.env, { CRON_SCHEDULER_SECRET: saved.s, APP_BASE_URL: saved.b, NEXT_PUBLIC_SITE_URL: saved.u });
    for (const k of Object.keys(process.env)) if (process.env[k] === "undefined") delete process.env[k];
  });
});
