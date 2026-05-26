"use client";

import { motion } from "framer-motion";

export function AmbientBackdrop() {
  return (
    <div className="anr-ps-ambient" aria-hidden>
      <div className="anr-ps-ambient__grid" />
      <div className="anr-ps-ambient__noise" />
      <motion.div
        className="anr-ps-ambient__orb anr-ps-ambient__orb--a"
        animate={{ x: [0, 24, -12, 0], y: [0, -18, 10, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="anr-ps-ambient__orb anr-ps-ambient__orb--b"
        animate={{ x: [0, -20, 14, 0], y: [0, 12, -16, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="anr-ps-ambient__mesh"
        animate={{ opacity: [0.35, 0.55, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
