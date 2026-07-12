"use client";

import { Library } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { AUDIO_PLAYLISTS_PLACEHOLDER } from "../data/placeholders";
import type { AudioTrack } from "../types";
import type { UseAudioV3Return } from "../hooks/useAudioV3";

export type PlaylistProps = {
  audio: UseAudioV3Return;
  tracksById?: Map<string, AudioTrack>;
  className?: string;
};

/**
 * JDP-016 — Curated playlists shell (placeholder data).
 */
export function Playlist({ audio, tracksById, className }: PlaylistProps) {
  const { playTrackById } = audio;

  const resolveTrack = (trackId: string) => {
    if (tracksById?.has(trackId)) return tracksById.get(trackId);
    return audio.tracks.find((t) => t.id === trackId);
  };

  return (
    <section className={cn("audio-v3-playlist", className)} aria-labelledby="audio-v3-playlist-title">
      <div className="audio-v3-playlist__header">
        <Library size={18} aria-hidden />
        <h3 id="audio-v3-playlist-title" className="audio-v3-playlist__title">
          Playlists
        </h3>
      </div>

      <ul className="audio-v3-playlist__list">
        {AUDIO_PLAYLISTS_PLACEHOLDER.map((playlist) => (
          <li key={playlist.id} className="audio-v3-playlist__card">
            <div className="audio-v3-playlist__card-head">
              <h4 className="audio-v3-playlist__card-title">{playlist.title}</h4>
              {playlist.placeholder && <span className="audio-v3-badge">Placeholder</span>}
            </div>
            {playlist.description && (
              <p className="audio-v3-playlist__card-desc">{playlist.description}</p>
            )}
            <ol className="audio-v3-playlist__tracks">
              {playlist.trackIds.map((trackId, i) => {
                const item = resolveTrack(trackId);
                if (!item) return null;
                return (
                  <li key={trackId}>
                    <button
                      type="button"
                      className="audio-v3-playlist__track jds-focus-ring"
                      onClick={() => playTrackById(trackId)}
                    >
                      <span className="audio-v3-playlist__track-num">{i + 1}</span>
                      <span lang={item.language === "hi" ? "hi" : undefined}>{item.headline}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ul>
    </section>
  );
}
