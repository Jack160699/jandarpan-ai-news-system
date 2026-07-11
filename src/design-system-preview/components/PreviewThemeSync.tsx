"use client";

import { useEffect } from "react";
import { useTheme } from "@/design-system/hooks/useTheme";

/** Sync JDS theme to html[data-theme] for CSS variable dark mode in preview */
export function PreviewThemeSync() {
  const { resolved } = useTheme();

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  return null;
}
