export type DayPhase = "dawn" | "morning" | "afternoon" | "evening" | "night";

export type LiveEditionState = {
  phase: DayPhase;
  editionLabel: string;
  deskStatus: string;
  updatedAt: string;
  liveMarker: boolean;
};

export function getDayPhase(date = new Date()): DayPhase {
  const h = date.getHours();
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

export function formatEditionTimestamp(date = new Date()): string {
  return date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDeskClock(date = new Date()): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function getLiveEditionState(date = new Date()): LiveEditionState {
  const phase = getDayPhase(date);
  const labels: Record<DayPhase, { edition: string; desk: string }> = {
    dawn: { edition: "First edition assembling", desk: "Night desk closing" },
    morning: { edition: "Morning edition", desk: "City desk active" },
    afternoon: { edition: "Afternoon refresh", desk: "Foreign desk filing" },
    evening: { edition: "Evening edition", desk: "Culture desk at press" },
    night: { edition: "Late edition", desk: "Investigations holding" },
  };

  return {
    phase,
    editionLabel: labels[phase].edition,
    deskStatus: labels[phase].desk,
    updatedAt: formatDeskClock(date),
    liveMarker: phase !== "night",
  };
}

export const PHASE_ATMOSPHERE: Record<
  DayPhase,
  { warmth: number; depth: number; tempo: number }
> = {
  dawn: { warmth: 0.2, depth: 0.08, tempo: 0.95 },
  morning: { warmth: 0.1, depth: 0.06, tempo: 1 },
  afternoon: { warmth: 0, depth: 0.1, tempo: 1.02 },
  evening: { warmth: 0.25, depth: 0.14, tempo: 0.92 },
  night: { warmth: -0.1, depth: 0.22, tempo: 0.88 },
};
