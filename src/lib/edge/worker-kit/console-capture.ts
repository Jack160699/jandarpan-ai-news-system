/**
 * Capture console output for the duration of a TEST-MODE run so a secret scan / diagnosis can see exactly what the
 * hosted runtime wrote (including library output). The original console still receives every line. Opt-in only.
 */
export function captureConsole(maxLines = 300): { lines: string[]; restore: () => void } {
  const lines: string[] = [];
  const methods = ["log", "info", "warn", "error", "debug"] as const;
  const originals = methods.map((m) => console[m]);
  methods.forEach((m, i) => {
    console[m] = (...args: unknown[]) => {
      if (lines.length < maxLines) {
        lines.push(
          args
            .map((a) => {
              if (typeof a === "string") return a;
              try {
                return JSON.stringify(a);
              } catch {
                return String(a);
              }
            })
            .join(" ")
            .slice(0, 800)
        );
      }
      originals[i]!.apply(console, args as never);
    };
  });
  return {
    lines,
    restore: () => methods.forEach((m, i) => (console[m] = originals[i]!)),
  };
}
