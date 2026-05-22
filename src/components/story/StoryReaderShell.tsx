"use client";

import dynamic from "next/dynamic";

const StoryReaderToolbar = dynamic(
  () =>
    import("@/components/story/StoryReaderToolbar").then(
      (m) => m.StoryReaderToolbar
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="immersive-chrome"
        aria-hidden
        style={{ minHeight: "3.25rem" }}
      />
    ),
  }
);

type StoryReaderShellProps = {
  slug: string;
  title: string;
  url: string;
  readTime: string;
};

export function StoryReaderShell(props: StoryReaderShellProps) {
  return <StoryReaderToolbar {...props} />;
}
