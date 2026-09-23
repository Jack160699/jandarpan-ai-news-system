"use client";

import type { EmbeddedVideo } from "@/lib/media/media-record";

type VideoEmbedProps = {
  video: EmbeddedVideo;
  className?: string;
  autoPlay?: boolean;
};

export function VideoEmbed({ video, className = "", autoPlay = false }: VideoEmbedProps) {
  if (!video.videoId || !video.embedUrl) return null;

  // Strict enforcement: Never autoplay sound, use privacy-enhanced embed domain
  const embedSrc = `${video.embedUrl}?autoplay=${autoPlay ? "1" : "0"}&mute=${autoPlay ? "1" : "0"}&rel=0&modestbranding=1`;

  return (
    <figure className={`video-embed my-6 ${className}`} aria-label={video.title ?? "Video report"}>
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/90 shadow-md border border-[var(--jds-color-border-subtle,rgba(0,0,0,0.1))]">
        <iframe
          src={embedSrc}
          title={video.title ?? "News Video"}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>

      <figcaption className="mt-2.5 flex items-center justify-between text-xs text-[var(--jds-color-text-secondary,#555)] px-1">
        <div className="flex items-center gap-1.5 font-medium truncate">
          <svg className="w-4 h-4 text-red-600 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          <span className="truncate">{video.title || "वीडियो रिपोर्ट"}</span>
        </div>
        {video.channel ? (
          <span className="shrink-0 text-[var(--jds-color-text-tertiary,#888)] ml-2">
            स्रोत: {video.channel}
          </span>
        ) : (
          <span className="shrink-0 text-[var(--jds-color-text-tertiary,#888)] ml-2">
            YouTube आधिकारिक प्रसारण
          </span>
        )}
      </figcaption>
    </figure>
  );
}
