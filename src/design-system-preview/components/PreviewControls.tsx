"use client";

import { useTheme } from "@/design-system/hooks/useTheme";
import type { ResolvedTheme } from "@/design-system/theme";

export function ThemeModeSwitch() {
  const { resolved, setMode } = useTheme();

  const modes: { value: ResolvedTheme; label: string }[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  return (
    <div className="jds-preview__theme-toggle" role="group" aria-label="Theme mode">
      {modes.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={`jds-preview__theme-btn${resolved === value ? " jds-preview__theme-btn--active" : ""}`}
          aria-pressed={resolved === value}
          onClick={() => setMode(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export type ViewportSize = "mobile" | "tablet" | "desktop";

type ViewportSwitchProps = {
  value: ViewportSize;
  onChange: (size: ViewportSize) => void;
};

export function ViewportSwitch({ value, onChange }: ViewportSwitchProps) {
  const sizes: { value: ViewportSize; label: string }[] = [
    { value: "mobile", label: "375" },
    { value: "tablet", label: "768" },
    { value: "desktop", label: "Full" },
  ];

  return (
    <div className="jds-preview__viewport-toggle" role="group" aria-label="Viewport width">
      {sizes.map(({ value: v, label }) => (
        <button
          key={v}
          type="button"
          className={`jds-preview__viewport-btn${value === v ? " jds-preview__viewport-btn--active" : ""}`}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

type ViewportFrameProps = {
  size: ViewportSize;
  children: React.ReactNode;
};

export function ViewportFrame({ size, children }: ViewportFrameProps) {
  return (
    <div className={`jds-preview__viewport-frame jds-preview__viewport-frame--${size}`}>
      <div className="jds-preview__viewport-inner">{children}</div>
    </div>
  );
}
