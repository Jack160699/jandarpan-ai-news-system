"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ArticleVoiceControlProps = {
  articleId: string;
  headline: string;
  summary?: string | null;
  paragraphs?: string[];
  language?: "hi" | "en" | "auto";
};

type SpeechStatus = "loading" | "playing" | "paused" | "idle";

/**
 * Strips markdown, URLs, image syntax, and formatting artifacts
 * so the synthetic voice reads pure, human-like news prose.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return "";
  return text
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove markdown images ![alt](url)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    // Remove raw URLs
    .replace(/https?:\/\/\S+/gi, "")
    // Remove markdown bold / italic / headings / quotes / code
    .replace(/[*_#`~>]/g, "")
    // Remove bullet characters
    .replace(/^\s*[-•*]\s+/gm, "")
    // Normalize newlines and whitespace
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits text into natural speech chunks at sentence boundaries
 * (Devanagari danda '।' in Hindi, '.' in English).
 * Sized ~40-150 chars to eliminate Chromium 15s freeze bug.
 */
export function splitIntoSpeechChunks(text: string): string[] {
  if (!text) return [];
  const clean = text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return [];

  // Split on Devanagari danda '।' or periods/question/exclamation
  const rawSentences = clean
    .split(/(?<=[।\.!\?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  for (const raw of rawSentences) {
    if (raw.length <= 150) {
      chunks.push(raw);
    } else {
      // Sub-split unusually long sentences at commas / semicolons
      const parts = raw.split(/(?<=[,;])\s+/);
      let current = "";
      for (const p of parts) {
        if ((current + " " + p).trim().length <= 150) {
          current = (current ? current + " " : "") + p;
        } else {
          if (current) chunks.push(current.trim());
          current = p;
        }
      }
      if (current) chunks.push(current.trim());
    }
  }

  // Merge very short chunks (e.g. "रायपुर।" or "नई दिल्ली.") with the next sentence
  const merged: string[] = [];
  for (const c of chunks) {
    if (
      merged.length > 0 &&
      merged[merged.length - 1].length < 25 &&
      merged[merged.length - 1].length + c.length <= 150
    ) {
      merged[merged.length - 1] = merged[merged.length - 1] + " " + c;
    } else {
      merged.push(c);
    }
  }

  return merged.length > 0 ? merged : [clean];
}

let cachedVoices: SpeechSynthesisVoice[] = [];

async function loadBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }
  if (cachedVoices.length > 0) return cachedVoices;
  const current = window.speechSynthesis.getVoices();
  if (current.length > 0) {
    cachedVoices = current;
    return cachedVoices;
  }

  return new Promise((resolve) => {
    let settled = false;
    const onVoicesChanged = () => {
      if (!settled) {
        settled = true;
        cachedVoices = window.speechSynthesis.getVoices();
        window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
        resolve(cachedVoices);
      }
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    setTimeout(() => {
      if (!settled) {
        settled = true;
        cachedVoices = window.speechSynthesis.getVoices();
        window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
        resolve(cachedVoices);
      }
    }, 350);
  });
}

function selectVoiceForLanguage(
  voices: SpeechSynthesisVoice[],
  language: "hi" | "en"
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  if (language === "hi") {
    return (
      voices.find(
        (v) =>
          (v.lang === "hi-IN" || v.lang.startsWith("hi")) &&
          (v.name.includes("Google") || v.name.includes("Natural") || v.name.toLowerCase().includes("female"))
      ) ||
      voices.find(
        (v) =>
          (v.lang === "hi-IN" || v.lang.startsWith("hi")) &&
          (v.name.includes("Swara") || v.name.includes("Heera") || v.name.includes("Kalpana") || v.name.includes("Lekha"))
      ) ||
      voices.find((v) => v.lang === "hi-IN") ||
      voices.find((v) => v.lang.startsWith("hi")) ||
      null
    );
  } else {
    return (
      voices.find(
        (v) =>
          (v.lang === "en-IN" || v.name.toLowerCase().includes("india")) &&
          (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Neerja"))
      ) ||
      voices.find((v) => v.lang === "en-IN" || v.name.toLowerCase().includes("india")) ||
      voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Google") || v.name.includes("Natural") || v.name.toLowerCase().includes("female"))
      ) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      null
    );
  }
}

/**
 * Minimal Floating Voice Control for individual news articles.
 *
 * Requirements:
 * - Position: Fixed bottom-right corner.
 * - Shape: Perfect circle (52px).
 * - Background: Premium dark navy surface with crimson accent.
 * - Icon: Play when paused/idle; Pause when playing.
 * - Automatic voice reading on article load (with graceful one-tap fallback when browser blocks autoplay).
 * - Reads Headline -> Summary -> Full Article Body sequentially.
 * - Pauses and resumes at exact position without restarting.
 * - Cancels speech immediately on unmount or navigation (zero overlapping audio).
 */
export function ArticleVoiceControl({
  articleId,
  headline,
  summary,
  paragraphs = [],
  language: langProp = "auto",
}: ArticleVoiceControlProps) {
  const [status, setStatus] = useState<SpeechStatus>("loading");
  const [isSupported, setIsSupported] = useState<boolean>(true);

  const chunkIndexRef = useRef<number>(0);
  const activeSessionRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Detect language (Devanagari presence is definitive)
  const resolvedLanguage = useMemo<"hi" | "en">(() => {
    if (langProp === "hi" || langProp === "en") return langProp;
    const combinedSample = `${headline} ${summary ?? ""} ${paragraphs.slice(0, 2).join(" ")}`;
    return /[\u0900-\u097F]/.test(combinedSample) ? "hi" : "en";
  }, [headline, summary, paragraphs, langProp]);

  // 2. Prepare speech text chunks: Headline -> Summary -> Full Body Paragraphs
  const speechChunks = useMemo<string[]>(() => {
    const rawSegments: string[] = [];
    if (headline?.trim()) {
      rawSegments.push(cleanTextForSpeech(headline));
    }
    if (summary?.trim()) {
      rawSegments.push(cleanTextForSpeech(summary));
    }
    for (const p of paragraphs) {
      const clean = cleanTextForSpeech(p);
      if (clean) rawSegments.push(clean);
    }

    const chunks: string[] = [];
    for (const seg of rawSegments) {
      chunks.push(...splitIntoSpeechChunks(seg));
    }
    return chunks;
  }, [headline, summary, paragraphs]);

  // 3. Stop all browser speech
  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  // 4. Speak a specific chunk sequence
  const speakFromIndex = useCallback(
    async (startIndex: number, sessionToken: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setIsSupported(false);
        setStatus("idle");
        return;
      }

      if (startIndex >= speechChunks.length) {
        chunkIndexRef.current = 0;
        setStatus("idle");
        return;
      }

      if (activeSessionRef.current !== sessionToken || isPausedRef.current) {
        return;
      }

      const text = speechChunks[startIndex];
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = resolvedLanguage === "hi" ? "hi-IN" : "en-IN";
      utter.rate = resolvedLanguage === "hi" ? 0.94 : 0.96;
      utter.pitch = 1.0;

      const voices = await loadBrowserVoices();
      if (activeSessionRef.current !== sessionToken) return;

      const voice = selectVoiceForLanguage(voices, resolvedLanguage);
      if (voice) {
        utter.voice = voice;
      }

      utter.onstart = () => {
        if (activeSessionRef.current !== sessionToken || isPausedRef.current) {
          stopSpeech();
          return;
        }
        if (watchdogTimerRef.current) {
          clearTimeout(watchdogTimerRef.current);
          watchdogTimerRef.current = null;
        }
        setStatus("playing");
      };

      utter.onend = () => {
        if (activeSessionRef.current !== sessionToken || isPausedRef.current) {
          return;
        }
        const nextIndex = startIndex + 1;
        chunkIndexRef.current = nextIndex;
        if (nextIndex < speechChunks.length) {
          void speakFromIndex(nextIndex, sessionToken);
        } else {
          chunkIndexRef.current = 0;
          setStatus("idle");
        }
      };

      utter.onerror = (e) => {
        if (
          isPausedRef.current ||
          activeSessionRef.current !== sessionToken ||
          e.error === "canceled" ||
          e.error === "interrupted"
        ) {
          return;
        }
        console.warn("[ArticleVoiceControl] Utterance error:", e.error);
        const nextIndex = startIndex + 1;
        chunkIndexRef.current = nextIndex;
        if (nextIndex < speechChunks.length) {
          void speakFromIndex(nextIndex, sessionToken);
        } else {
          chunkIndexRef.current = 0;
          setStatus("idle");
        }
      };

      try {
        window.speechSynthesis.speak(utter);
      } catch (err) {
        console.warn("[ArticleVoiceControl] speak failed:", err);
        setStatus("idle");
      }
    },
    [speechChunks, resolvedLanguage, stopSpeech]
  );

  // 5. Toggle Play / Pause
  const handleToggle = useCallback(() => {
    if (status === "playing") {
      // Pause immediately and preserve chunk index
      isPausedRef.current = true;
      stopSpeech();
      setStatus("paused");
    } else if (status === "paused") {
      // Resume from current chunk
      isPausedRef.current = false;
      const session = Date.now();
      activeSessionRef.current = session;
      setStatus("playing");
      void speakFromIndex(chunkIndexRef.current, session);
    } else {
      // Start from current or beginning
      isPausedRef.current = false;
      stopSpeech();
      const session = Date.now();
      activeSessionRef.current = session;
      setStatus("playing");
      void speakFromIndex(chunkIndexRef.current || 0, session);
    }
  }, [status, stopSpeech, speakFromIndex]);

  // 6. Mount & Autoplay attempt
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSupported(false);
      setStatus("idle");
      return;
    }

    // Cancel any previous audio immediately so articles don't overlap
    stopSpeech();

    const session = Date.now();
    activeSessionRef.current = session;
    chunkIndexRef.current = 0;
    isPausedRef.current = false;

    // Start loading voices
    void loadBrowserVoices().then(() => {
      if (activeSessionRef.current !== session) return;

      // Watchdog: If browser blocks audible autoplay, revert to ready-to-play idle state
      watchdogTimerRef.current = setTimeout(() => {
        if (activeSessionRef.current === session && status === "loading") {
          // Browser blocked unprompted autoplay (standard mobile policy)
          stopSpeech();
          setStatus("idle");
        }
      }, 550);

      // Attempt automatic playback
      void speakFromIndex(0, session);
    });

    // Cleanup on unmount or navigation
    return () => {
      activeSessionRef.current = 0;
      isPausedRef.current = true;
      stopSpeech();
    };
  }, [articleId]); // Re-run when navigating to a new article

  // 7. Global listener for inline listen triggers
  useEffect(() => {
    const handleCustomTrigger = () => {
      handleToggle();
    };
    window.addEventListener("jd-toggle-article-voice", handleCustomTrigger);
    return () => {
      window.removeEventListener("jd-toggle-article-voice", handleCustomTrigger);
    };
  }, [handleToggle]);

  // 8. Lifecycle events: pause/stop on visibility change or tab close
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && status === "playing") {
        isPausedRef.current = true;
        stopSpeech();
        setStatus("paused");
      }
    };
    const handleBeforeUnload = () => {
      stopSpeech();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handleBeforeUnload);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handleBeforeUnload);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [status, stopSpeech]);

  if (!isSupported || speechChunks.length === 0) {
    return null;
  }

  const isPlaying = status === "playing";
  const isLoading = status === "loading";

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes jdVoicePulse {
          0% {
            box-shadow: 0 0 0 0 rgba(160, 24, 48, 0.6), 0 8px 24px rgba(0, 0, 0, 0.45);
          }
          70% {
            box-shadow: 0 0 0 12px rgba(160, 24, 48, 0), 0 8px 24px rgba(0, 0, 0, 0.45);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(160, 24, 48, 0), 0 8px 24px rgba(0, 0, 0, 0.45);
          }
        }
        @keyframes jdVoiceSpin {
          to {
            transform: rotate(360deg);
          }
        }
        .jd-floating-voice-btn:hover {
          transform: scale(1.05);
        }
        .jd-floating-voice-btn:active {
          transform: scale(0.92);
        }
      `,
        }}
      />

      <button
        type="button"
        onClick={handleToggle}
        aria-label={
          isPlaying
            ? "आवाज़ रोकें (Pause voice narration)"
            : "लेख सुनें (Listen to article)"
        }
        title={
          isPlaying
            ? "रोकें (Pause)"
            : status === "paused"
              ? "फिर से शुरू करें (Resume)"
              : "सुनें (Play)"
        }
        className="jd-floating-voice-btn"
        data-testid="jd-floating-voice-btn"
        data-state={status}
        style={{
          position: "fixed",
          right: "calc(20px + env(safe-area-inset-right, 0px))",
          bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          width: 52,
          height: 52,
          minWidth: 52,
          minHeight: 52,
          borderRadius: "50%",
          background: "#0a1628",
          border: isPlaying ? "2px solid #e53e3e" : "2px solid #a01830",
          boxShadow: isPlaying
            ? "0 0 0 4px rgba(160, 24, 48, 0.35), 0 8px 24px rgba(0, 0, 0, 0.5)"
            : "0 4px 18px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 990,
          outline: "none",
          transition: "transform 0.18s ease, background-color 0.2s ease, border-color 0.2s ease",
          animation: isPlaying ? "jdVoicePulse 2s ease-in-out infinite" : "none",
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {isLoading ? (
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: "2.5px solid rgba(255, 255, 255, 0.25)",
              borderTopColor: "#ffffff",
              animation: "jdVoiceSpin 0.75s linear infinite",
            }}
          />
        ) : isPlaying ? (
          // Pause Icon: two vertical rounded bars
          <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="#ffffff"
            aria-hidden="true"
            style={{ display: "block" }}
          >
            <rect x="6" y="4" width="4" height="16" rx="1.5" />
            <rect x="14" y="4" width="4" height="16" rx="1.5" />
          </svg>
        ) : (
          // Play Icon: solid triangle offset for optical center
          <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="#ffffff"
            aria-hidden="true"
            style={{ display: "block", marginLeft: 2 }}
          >
            <path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11-7.36a1 1 0 0 0 0-1.72l-11-7.36a1 1 0 0 0-1.5.86z" />
          </svg>
        )}
      </button>
    </>
  );
}
