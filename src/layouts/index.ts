/**
 * JDP-002 — Application Shell barrel export
 *
 * Generic layout primitives from @stratxcel/platform; Jan Darpan shell chrome remains local.
 */

import "./styles/shell.css";

// Platform layout primitives
export {
  SafeArea,
  ScrollArea,
  PageContainer,
  ContentContainer,
  ResponsiveGrid,
} from "@stratxcel/platform/layouts";

// Jan Darpan shell types and configuration
export type * from "./types";
export * from "./constants";

// Shell hooks (local storage keys preserved for backwards compatibility)
export * from "./hooks";

// Jan Darpan application shell chrome
export { AppShell, ShellProvider, useShell } from "./AppShell";
export { TopBar } from "./TopBar";
export { BottomNavigation } from "./BottomNavigation";
export { DesktopSidebar } from "./DesktopSidebar";
export { CommandPalette } from "./CommandPalette";
export { SearchOverlay } from "./SearchOverlay";
export { QuickActions } from "./QuickActions";
