"use client";

import { useEffect, useState } from "react";

type ClientTimePreset = "clock" | "time" | "date" | "datetime";

type ClientTimeProps = {
  /** ISO timestamp — omit for live clock */
  iso?: string | null;
  locale?: string;
  preset?: ClientTimePreset;
  options?: Intl.DateTimeFormatOptions;
  className?: string;
  /** Shown until client formats (avoids layout shift) */
  placeholder?: string;
};

const DEFAULT_CLOCK_OPTS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
};

function formatValue(
  preset: ClientTimePreset,
  locale: string,
  iso: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = preset === "clock" ? new Date() : iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "";

  switch (preset) {
    case "clock":
      return d.toLocaleTimeString(locale, options ?? DEFAULT_CLOCK_OPTS);
    case "date":
      return d.toLocaleDateString(locale, options);
    case "datetime":
      return d.toLocaleString(locale, options);
    case "time":
    default:
      return d.toLocaleTimeString(
        locale,
        options ?? { hour: "numeric", minute: "2-digit" }
      );
  }
}

/**
 * Renders formatted time only after mount — never during SSR.
 */
export function ClientTime({
  iso,
  locale = "en-IN",
  preset = "time",
  options,
  className,
  placeholder = "\u00a0",
}: ClientTimeProps) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setLabel(formatValue(preset, locale, iso, options));
    };

    update();

    if (preset !== "clock") return;

    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
    // options intentionally omitted — stable presets avoid effect churn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso, locale, preset]);

  if (!label) {
    return (
      <span className={className} aria-hidden="true">
        {placeholder}
      </span>
    );
  }

  return <span className={className}>{label}</span>;
}
