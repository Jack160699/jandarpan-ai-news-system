"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { buttonPressProps, type ButtonPressOptions } from "../button-press";
import { useMotionConfig } from "../useMotionConfig";

export type MotionButtonProps = HTMLMotionProps<"button"> &
  Pick<ButtonPressOptions, "scale">;

/** Button with tap-scale micro-interaction. */
export function MotionButton({
  className,
  scale,
  type = "button",
  whileTap: whileTapProp,
  whileHover: whileHoverProp,
  transition: transitionProp,
  ...props
}: MotionButtonProps) {
  const { reduced } = useMotionConfig();
  const motionProps = useMemo(
    () => buttonPressProps({ reduced, scale }),
    [reduced, scale]
  );

  return (
    <motion.button
      type={type}
      className={cn("jds-motion-button", className)}
      whileTap={whileTapProp ?? motionProps.whileTap}
      whileHover={whileHoverProp ?? motionProps.whileHover}
      transition={transitionProp ?? motionProps.transition}
      {...props}
    />
  );
}
