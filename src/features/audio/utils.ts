export function formatAudioTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function progressPercent(current: number, duration: number): number {
  if (duration <= 0) return 0;
  return Math.min(100, (current / duration) * 100);
}
