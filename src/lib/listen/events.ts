export const RESTORE_TOP_TEN_EVENT = "jdp:top-ten-restore";

export function restoreTopTenLauncher() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(RESTORE_TOP_TEN_EVENT));
}
