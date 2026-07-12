/**
 * JDP-009 — Motion library barrel export
 *
 * Reusable animation presets and components for Project Phoenix.
 * All animations respect prefers-reduced-motion via useMotionConfig / useReducedMotion.
 *
 * @example
 * import { Fade, Stagger, StaggerItem, createSlideVariants } from "@/design-system/motion";
 */
export * from "./types";
export * from "./utils";
export { useMotionConfig } from "./useMotionConfig";

// Presets
export * from "./fade";
export * from "./slide";
export * from "./scale";
export * from "./reveal";
export * from "./stagger";
export * from "./hero-transition";
export * from "./page-transition";
export * from "./card-hover";
export * from "./button-press";
export * from "./list-animation";

// Components
export * from "./components";
