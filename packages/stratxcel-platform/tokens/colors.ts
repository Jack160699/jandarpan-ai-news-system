/**
 * JDP-001 — Semantic color tokens
 *
 * Components MUST reference semantic tokens — never raw hex values.
 * Values align with Jan Darpan editorial brand (warm paper + news red).
 */

/** Raw palette — internal use for theme assembly only */
const palette = {
  red: "#ff2b2b",
  redLight: "#ff4d4d",
  redDeep: "#e50914",
  redDark: "#b71c1c",
  redDarker: "#7f1010",
  paper: "#f5f1e8",
  surface: "#fffdf8",
  surfaceMuted: "#efe7da",
  ink: "#1a1a1a",
  inkSecondary: "#3a3834",
  inkMuted: "#5e5a55",
  inkFaint: "#7a756e",
  rule: "#d8ccb8",
  ruleStrong: "#c9bba3",
  white: "#ffffff",
  black: "#050505",
  amoled: "#0b0b0b",
  amoledMuted: "#111111",
  emerald: "#059669",
  amber: "#d97706",
  rose: "#e11d48",
  sky: "#0284c7",
  violet: "#7c3aed",
  orange: "#ea580c",
  teal: "#0d9488",
  indigo: "#4f46e5",
  slate: "#64748b",
} as const;

export type SemanticColors = {
  background: {
    primary: string;
    secondary: string;
  };
  surface: {
    primary: string;
    secondary: string;
    elevated: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  border: {
    subtle: string;
    default: string;
    strong: string;
  };
  brand: {
    primary: string;
    secondary: string;
  };
  success: string;
  warning: string;
  danger: string;
  info: string;
  breaking: string;
  ai: string;
  government: string;
  weather: string;
  sports: string;
  business: string;
  politics: string;
};

export const lightColors: SemanticColors = {
  background: {
    primary: palette.paper,
    secondary: palette.surfaceMuted,
  },
  surface: {
    primary: palette.surface,
    secondary: palette.surfaceMuted,
    elevated: palette.surface,
  },
  text: {
    primary: palette.ink,
    secondary: palette.inkSecondary,
    tertiary: palette.inkMuted,
    inverse: palette.white,
  },
  border: {
    subtle: palette.rule,
    default: palette.rule,
    strong: palette.ruleStrong,
  },
  brand: {
    primary: palette.red,
    secondary: palette.redDeep,
  },
  success: palette.emerald,
  warning: palette.amber,
  danger: palette.rose,
  info: palette.sky,
  breaking: palette.red,
  ai: palette.violet,
  government: palette.indigo,
  weather: palette.teal,
  sports: palette.orange,
  business: palette.slate,
  politics: palette.redDark,
};

export const darkColors: SemanticColors = {
  background: {
    primary: palette.black,
    secondary: palette.amoledMuted,
  },
  surface: {
    primary: palette.amoled,
    secondary: palette.amoledMuted,
    elevated: "#141414",
  },
  text: {
    primary: palette.white,
    secondary: "rgb(255 255 255 / 0.78)",
    tertiary: "rgb(255 255 255 / 0.62)",
    inverse: palette.black,
  },
  border: {
    subtle: "rgb(255 255 255 / 0.06)",
    default: "rgb(255 255 255 / 0.08)",
    strong: "rgb(255 255 255 / 0.12)",
  },
  brand: {
    primary: palette.red,
    secondary: palette.redLight,
  },
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#fb7185",
  info: "#38bdf8",
  breaking: palette.red,
  ai: "#a78bfa",
  government: "#818cf8",
  weather: "#2dd4bf",
  sports: "#fb923c",
  business: "#94a3b8",
  politics: palette.redLight,
};

/** Flatten semantic colors to CSS custom property names */
export function colorsToCssVars(colors: SemanticColors): Record<string, string> {
  return {
    "--jds-color-background-primary": colors.background.primary,
    "--jds-color-background-secondary": colors.background.secondary,
    "--jds-color-surface-primary": colors.surface.primary,
    "--jds-color-surface-secondary": colors.surface.secondary,
    "--jds-color-surface-elevated": colors.surface.elevated,
    "--jds-color-text-primary": colors.text.primary,
    "--jds-color-text-secondary": colors.text.secondary,
    "--jds-color-text-tertiary": colors.text.tertiary,
    "--jds-color-text-inverse": colors.text.inverse,
    "--jds-color-border-subtle": colors.border.subtle,
    "--jds-color-border-default": colors.border.default,
    "--jds-color-border-strong": colors.border.strong,
    "--jds-color-brand-primary": colors.brand.primary,
    "--jds-color-brand-secondary": colors.brand.secondary,
    "--jds-color-success": colors.success,
    "--jds-color-warning": colors.warning,
    "--jds-color-danger": colors.danger,
    "--jds-color-info": colors.info,
    "--jds-color-breaking": colors.breaking,
    "--jds-color-ai": colors.ai,
    "--jds-color-government": colors.government,
    "--jds-color-weather": colors.weather,
    "--jds-color-sports": colors.sports,
    "--jds-color-business": colors.business,
    "--jds-color-politics": colors.politics,
  };
}

export const colors = { light: lightColors, dark: darkColors } as const;

/** CSS custom property references for use in components and inline styles */
const cv = (name: string) => `var(--jds-color-${name})` as const;

export const colorVars = {
  background: {
    primary: cv("background-primary"),
    secondary: cv("background-secondary"),
  },
  surface: {
    primary: cv("surface-primary"),
    secondary: cv("surface-secondary"),
    elevated: cv("surface-elevated"),
  },
  text: {
    primary: cv("text-primary"),
    secondary: cv("text-secondary"),
    tertiary: cv("text-tertiary"),
    inverse: cv("text-inverse"),
  },
  border: {
    subtle: cv("border-subtle"),
    default: cv("border-default"),
    strong: cv("border-strong"),
  },
  brand: {
    primary: cv("brand-primary"),
    secondary: cv("brand-secondary"),
  },
  status: {
    success: cv("success"),
    warning: cv("warning"),
    danger: cv("danger"),
    info: cv("info"),
  },
  editorial: {
    breaking: cv("breaking"),
    ai: cv("ai"),
    government: cv("government"),
    weather: cv("weather"),
    sports: cv("sports"),
    business: cv("business"),
    politics: cv("politics"),
  },
} as const;
