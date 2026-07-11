/**
 * Stratxcel Platform
 *
 * Reusable architecture for Stratxcel applications.
 * Extracted from Jan Darpan (Project Phoenix — Phase 1).
 *
 * @example
 * import { Button, ThemeProvider, AppShell primitives } from "@stratxcel/platform";
 * import "@stratxcel/platform/theme/variables.css";
 */

import "./theme/variables.css";

// Core layers
export * from "./tokens";
export * from "./theme";
export * from "./utils";
export * from "./accessibility";
export * from "./hooks";
export * from "./ui";
export * from "./motion";
export * from "./layouts";
export * from "./app-shell";
export * from "./search";

// Namespaced re-exports
export * as designSystem from "./design-system";
export * as analytics from "./analytics";
export * as notifications from "./notifications";
export * as onboarding from "./onboarding";
export * as providers from "./providers";
