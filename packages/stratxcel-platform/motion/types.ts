/**
 * JDP-009 — Motion library shared types
 */
import type { HTMLMotionProps, Transition, Variants } from "framer-motion";
import type { DurationToken, MotionPreset } from "../tokens";

export type SlideDirection = "up" | "down" | "left" | "right";

export type RevealAxis = "y" | "x";

export type MotionComponentProps = HTMLMotionProps<"div">;

export type VariantFactoryOptions = {
  /** Skip transforms and delays when user prefers reduced motion */
  reduced?: boolean;
  /** Duration token override */
  duration?: DurationToken;
  /** Motion preset override */
  preset?: MotionPreset;
  /** Stagger delay between children (seconds) */
  stagger?: number;
  /** Distance for slide/reveal offsets (px) */
  distance?: number;
};

export type ResolvedMotionConfig = {
  reduced: boolean;
  transition: Transition;
  instantTransition: Transition;
};

export type MotionVariants = Variants;
