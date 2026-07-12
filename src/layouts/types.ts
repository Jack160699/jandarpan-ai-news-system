import type { ReactNode } from "react";
import type { maxContentWidth } from "./constants";

export type ContentWidthVariant = keyof typeof maxContentWidth;

export type SidebarState = {
  collapsed: boolean;
  width: number;
};

export type ShellContextValue = {
  commandOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  sidebar: SidebarState;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
};

export type AppShellProps = {
  children: ReactNode;
  /** Homepage trending/ticker slot (portal target, not chrome) */
  homeStackSlot?: ReactNode;
  /** Hide bottom navigation (story reader mode) */
  hideBottomNav?: boolean;
  /** Content width preset for PageContainer */
  contentWidth?: ContentWidthVariant;
};

export type CommandItem = {
  id: string;
  label: string;
  href?: string;
  group: "articles" | "districts" | "topics" | "live" | "commands" | "recent";
  meta?: string;
  onSelect?: () => void;
};
