"use client";

import { motion } from "framer-motion";
import { editorialParagraph } from "@/animations/presets";
import { cn } from "@/lib/cn";

type EditorialRevealProps = {
  className?: string;
  paragraphs: string[];
};

export function EditorialReveal({ className, paragraphs }: EditorialRevealProps) {
  return (
    <div className={cn("space-y-5", className)}>
      {paragraphs.map((text, i) => (
        <motion.p
          key={i}
          className="editorial-body max-w-prose"
          custom={i}
          variants={editorialParagraph}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10% 0px" }}
        >
          {text}
        </motion.p>
      ))}
    </div>
  );
}
