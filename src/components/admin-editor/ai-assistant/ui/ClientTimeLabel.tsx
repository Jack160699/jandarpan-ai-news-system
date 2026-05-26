"use client";

import { useClientMounted } from "../hooks/useClientMounted";

type ClientTimeLabelProps = {
  iso: string;
  preset?: "time" | "datetime-short" | "datetime-medium";
  className?: string;
};

function formatIso(iso: string, preset: ClientTimeLabelProps["preset"]): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  switch (preset) {
    case "time":
      return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    case "datetime-medium":
      return date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    case "datetime-short":
    default:
      return date.toLocaleString("en-IN", {
        dateStyle: "short",
        timeStyle: "short",
      });
  }
}

/** Avoids locale/timezone hydration mismatches by formatting only after mount. */
export function ClientTimeLabel({
  iso,
  preset = "datetime-short",
  className,
}: ClientTimeLabelProps) {
  const mounted = useClientMounted();
  const label = mounted ? formatIso(iso, preset) : "\u00a0";

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {label}
    </time>
  );
}
