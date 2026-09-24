"use client";

/**
 * Jan Darpan Live — Professional Television-News Audio Package
 *
 * Provides synthesized broadcast audio stings using the Web Audio API:
 *   - Intro sting: Opening television news fanfare chord
 *   - Number sting: Distinctive countdown blip/chime (10 → 1)
 *   - Transition sting: Quick professional 0.6s newsroom transition
 *   - Breaking sting: Urgent dramatic alert chime
 *   - Outro sting: Clean concluding broadcast resolve
 *
 * Zero external audio network dependencies, zero latency, lightweight, 100% reliable.
 * Restrained volume so spoken anchor voice always remains dominant.
 */

function getSafeContext(providedCtx?: AudioContext | null): AudioContext | null {
  if (providedCtx && providedCtx.state !== "closed") {
    if (providedCtx.state === "suspended") {
      void providedCtx.resume().catch(() => {});
    }
    return providedCtx;
  }
  if (typeof window === "undefined") return null;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Short Jan Darpan opening news fanfare (1.4s).
 * 3-chord major broadcast signature.
 */
export function playIntroSting(ctxParam?: AudioContext | null): void {
  try {
    const ctx = getSafeContext(ctxParam);
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.18, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    masterGain.connect(ctx.destination);

    // D4 (293.66Hz) -> F#4 (369.99Hz) -> A4 (440Hz) -> D5 (587.33Hz)
    const notes = [
      { freq: 293.66, start: 0, dur: 0.5 },
      { freq: 440.0, start: 0.2, dur: 0.6 },
      { freq: 587.33, start: 0.45, dur: 0.95 },
      { freq: 880.0, start: 0.5, dur: 0.9 },
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + start);

      noteGain.gain.setValueAtTime(0, now + start);
      noteGain.gain.linearRampToValueAtTime(0.3, now + start + 0.05);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  } catch {
    // Ignore audio failures silently
  }
}

/**
 * Short distinctive number sting for the countdown (10 → 1) (0.45s).
 * Pitched subtly based on rank to reinforce countdown progression.
 */
export function playNumberSting(rank: number, ctxParam?: AudioContext | null): void {
  try {
    const ctx = getSafeContext(ctxParam);
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.16, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    masterGain.connect(ctx.destination);

    // Subtle pitch scale: as rank drops from 10 down to 1, frequency climbs slightly
    const baseFreq = 520 + (11 - Math.max(1, Math.min(10, rank))) * 28;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.12);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(baseFreq * 2, now + 0.05);

    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    gain2.gain.setValueAtTime(0.2, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc2.connect(gain2);
    gain2.connect(masterGain);

    osc1.start(now);
    osc1.stop(now + 0.45);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.5);
  } catch {
    // Ignore audio failures silently
  }
}

/**
 * Short professional broadcast story transition (0.6s).
 * Soft harmonic whoosh pulse.
 */
export function playTransitionSting(ctxParam?: AudioContext | null): void {
  try {
    const ctx = getSafeContext(ctxParam);
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.14, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.5);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(2400, now + 0.15);
    filter.frequency.linearRampToValueAtTime(600, now + 0.6);

    osc.connect(filter);
    filter.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.65);
  } catch {
    // Ignore audio failures silently
  }
}

/**
 * Dramatic breaking news alert sting (0.8s).
 * Urgent two-tone broadcast alarm pulse.
 */
export function playBreakingSting(ctxParam?: AudioContext | null): void {
  try {
    const ctx = getSafeContext(ctxParam);
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.2, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    masterGain.connect(ctx.destination);

    const pulses = [
      { freq: 880, start: 0, dur: 0.18 },
      { freq: 659.25, start: 0.2, dur: 0.18 },
      { freq: 987.77, start: 0.42, dur: 0.4 },
    ];

    pulses.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now + start);

      // Low-pass filter to smooth harsh square wave into news tone
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1800;

      gain.gain.setValueAtTime(0.35, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  } catch {
    // Ignore audio failures silently
  }
}

/**
 * Concluding broadcast outro sting (0.9s).
 * Soft resolution before restart or queue refresh.
 */
export function playOutroSting(ctxParam?: AudioContext | null): void {
  try {
    const ctx = getSafeContext(ctxParam);
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.14, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    masterGain.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = "sine";
    osc2.type = "triangle";
    osc1.frequency.setValueAtTime(587.33, now);
    osc2.frequency.setValueAtTime(440.0, now);

    osc1.connect(masterGain);
    osc2.connect(masterGain);

    osc1.start(now);
    osc1.stop(now + 0.9);
    osc2.start(now);
    osc2.stop(now + 0.9);
  } catch {
    // Ignore audio failures silently
  }
}
