"use client";

import { motion, useReducedMotion } from "framer-motion";

const HEADLINES = [
  "Raipur civic desk: metro corridor review today",
  "Bilaspur industry: steel plant expansion update",
  "Monsoon alert across Bastar and Dantewada",
  "CG Assembly: budget session live from capital",
  "Durg mining policy: state cabinet briefing",
  "Rajnandgaon: irrigation project milestone",
];

export function LanguageGateBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#050203]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0508]/90 via-[#080404]/95 to-[#030101]" />

      <motion.div
        className="absolute -left-[12%] top-[8%] h-56 w-56 rounded-full bg-[#c41e3a]/25 blur-[90px]"
        animate={
          reduceMotion
            ? undefined
            : { x: [0, 24, 0], y: [0, -18, 0], opacity: [0.35, 0.55, 0.35] }
        }
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[8%] bottom-[18%] h-64 w-64 rounded-full bg-[#ff2a2a]/15 blur-[100px]"
        animate={
          reduceMotion
            ? undefined
            : { x: [0, -20, 0], y: [0, 14, 0], opacity: [0.25, 0.45, 0.25] }
        }
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute inset-0 opacity-[0.22] blur-[6px]">
        <div className="grid h-full w-full grid-cols-2 gap-3 p-4 pt-16 sm:grid-cols-3 sm:gap-4 sm:p-8">
          {HEADLINES.map((line, i) => (
            <motion.div
              key={line}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-3 backdrop-blur-sm"
              initial={false}
              animate={
                reduceMotion
                  ? undefined
                  : { y: [0, i % 2 === 0 ? -6 : 6, 0] }
              }
              transition={{
                duration: 8 + i * 0.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <span className="mb-2 inline-block rounded-full bg-[#c41e3a]/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                Live
              </span>
              <p className="font-[family-name:var(--font-ui)] text-[11px] font-semibold leading-snug text-white/70">
                {line}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#050203_72%)]" />
      <div className="absolute inset-0 backdrop-blur-[28px]" />

      {!reduceMotion ? (
        <div className="lang-gate-particles absolute inset-0">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="lang-gate-particles__dot"
              style={{
                left: `${(i * 17) % 100}%`,
                top: `${(i * 23 + 5) % 100}%`,
                animationDelay: `${i * 0.35}s`,
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
