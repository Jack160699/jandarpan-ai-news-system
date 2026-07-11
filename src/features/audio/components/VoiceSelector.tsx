"use client";

import { Mic } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { AUDIO_VOICES_PLACEHOLDER } from "../data/placeholders";
import type { UseAudioV3Return } from "../hooks/useAudioV3";

export type VoiceSelectorProps = {
  audio: UseAudioV3Return;
  className?: string;
};

/**
 * JDP-016 — Narrator voice picker (placeholder; does not call TTS backend).
 */
export function VoiceSelector({ audio, className }: VoiceSelectorProps) {
  const { voiceId, setVoiceId, selectedVoice } = audio;

  return (
    <div className={cn("audio-v3-voice", className)} aria-labelledby="audio-v3-voice-label">
      <div className="audio-v3-voice__header">
        <Mic size={16} aria-hidden />
        <span id="audio-v3-voice-label" className="audio-v3-voice__label">
          Narrator voice
        </span>
      </div>

      <p className="audio-v3-voice__selected">
        Selected: <strong>{selectedVoice?.label}</strong>
        {selectedVoice?.placeholder ? (
          <span className="audio-v3-badge audio-v3-badge--inline">Placeholder</span>
        ) : null}
      </p>

      <div className="audio-v3-voice__options" role="radiogroup" aria-label="Narrator voice">
        {AUDIO_VOICES_PLACEHOLDER.map((voice) => (
          <button
            key={voice.id}
            type="button"
            role="radio"
            aria-checked={voiceId === voice.id}
            className={cn(
              "audio-v3-voice__option",
              "jds-focus-ring",
              voiceId === voice.id && "audio-v3-voice__option--active",
            )}
            onClick={() => setVoiceId(voice.id)}
          >
            <span className="audio-v3-voice__option-label">{voice.label}</span>
            <span className="audio-v3-voice__option-desc">{voice.description}</span>
            <span className="audio-v3-voice__option-lang">{voice.language.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <p className="audio-v3-placeholder-note">
        Voice selection is UI-only — TTS generation is unchanged.
      </p>
    </div>
  );
}
