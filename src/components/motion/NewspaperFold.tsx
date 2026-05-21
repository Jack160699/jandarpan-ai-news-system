"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { newspaperFold } from "@/animations/presets";
import { cn } from "@/lib/cn";

type NewspaperFoldProps = HTMLMotionProps<"article">;

export function NewspaperFold({
  className,
  children,
  ...props
}: NewspaperFoldProps) {
  return (
    <motion.article
      className={cn("paper-fold perspective-[1200px]", className)}
      variants={newspaperFold}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-8% 0px" }}
      {...props}
    >
      {children}
    </motion.article>
  );
}
