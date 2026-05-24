"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

type SuperMenuSectionProps = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function SuperMenuSection({
  id,
  title,
  subtitle,
  icon,
  defaultOpen = true,
  children,
}: SuperMenuSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reduceMotion = useReducedMotion();

  return (
    <section className="sm-section" aria-labelledby={`${id}-title`}>
      <button
        type="button"
        id={`${id}-title`}
        className="sm-section__head tap-target"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sm-section__head-left">
          {icon ? <span className="sm-section__icon">{icon}</span> : null}
          <span>
            <span className="sm-section__title">{title}</span>
            {subtitle ? (
              <span className="sm-section__subtitle">{subtitle}</span>
            ) : null}
          </span>
        </span>
        <ChevronDown
          className={`sm-section__chev${open ? " is-open" : ""}`}
          size={18}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={`${id}-panel`}
            className="sm-section__body"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
