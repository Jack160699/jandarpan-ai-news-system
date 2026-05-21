"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { typographyReveal } from "@/animations/presets";
import { cn } from "@/lib/cn";

type TypographyRevealProps = HTMLMotionProps<"div">;

export function TypographyReveal({
  className,
  children,
  ...props
}: TypographyRevealProps) {
  return (
    <motion.div
      className={cn("overflow-hidden", className)}
      variants={typographyReveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-12% 0px" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
