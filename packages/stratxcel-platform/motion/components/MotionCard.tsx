"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { cardHoverProps, type CardHoverOptions } from "../card-hover";
import { useMotionConfig } from "../useMotionConfig";

export type MotionCardProps = HTMLMotionProps<"div"> &
  Pick<CardHoverOptions, "lift" | "scale">;

/** Interactive card with lift-on-hover and press feedback. */
export function MotionCard({
  className,
  lift,
  scale,
  whileHover: whileHoverProp,
  whileTap: whileTapProp,
  transition: transitionProp,
  ...props
}: MotionCardProps) {
  const { reduced } = useMotionConfig();
  const motionProps = useMemo(
    () => cardHoverProps({ reduced, lift, scale }),
    [reduced, lift, scale]
  );

  return (
    <motion.div
      className={cn("jds-motion-card", className)}
      whileHover={whileHoverProp ?? motionProps.whileHover}
      whileTap={whileTapProp ?? motionProps.whileTap}
      transition={transitionProp ?? motionProps.transition}
      {...props}
    />
  );
}
