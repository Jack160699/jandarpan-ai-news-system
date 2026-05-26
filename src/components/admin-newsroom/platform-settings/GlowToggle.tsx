"use client";

import { motion } from "framer-motion";

export function GlowToggle({
  enabled,
  disabled,
  onChange,
  label,
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      className={`anr-ps-toggle ${enabled ? "anr-ps-toggle--on" : ""}`}
      onClick={onChange}
    >
      <motion.span
        className="anr-ps-toggle__thumb"
        layout
        transition={{ type: "spring", stiffness: 520, damping: 32 }}
      />
      {enabled ? <span className="anr-ps-toggle__glow" aria-hidden /> : null}
    </button>
  );
}
