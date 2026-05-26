"use client";

import { motion } from "framer-motion";
import { Activity, AlertTriangle, Bot, Radio, Sparkles, Zap } from "lucide-react";
import { AmbientBackdrop } from "@/components/admin-newsroom/platform-settings/AmbientBackdrop";
import { useAnimatedCounter } from "@/components/admin-newsroom/platform-settings/hooks/useAnimatedCounter";
import { LiveIndicator } from "@/components/admin-newsroom/ui/LiveIndicator";
import { useNewsroomMetrics } from "@/components/admin-newsroom/platform-settings/hooks/useNewsroomMetrics";

function HeroMetric({
  label,
  value,
  suffix,
  accent,
  pulse,
}: {
  label: string;
  value: number;
  suffix?: string;
  accent?: boolean;
  pulse?: boolean;
}) {
  const animated = useAnimatedCounter(value);
  return (
    <div className={`anr-ps-hero-metric ${accent ? "anr-ps-hero-metric--accent" : ""}`}>
      <span>{label}</span>
      <strong>
        {pulse ? <span className="anr-ps-pulse-dot" aria-hidden /> : null}
        {suffix === "%"
          ? `${animated.toFixed(2)}%`
          : `${Math.round(animated).toLocaleString("en-IN")}${suffix ?? ""}`}
      </strong>
    </div>
  );
}

export function CommandHero({
  saving,
  onOpenCommand,
}: {
  saving: boolean;
  onOpenCommand: () => void;
}) {
  const m = useNewsroomMetrics();

  return (
    <motion.section
      className="anr-ps-command-hero"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <AmbientBackdrop />
      <div className="anr-ps-command-hero__inner">
        <div className="anr-ps-command-hero__top">
          <div>
            <span className="anr-platform-settings__badge">
              <Sparkles size={12} aria-hidden />
              Jandarpan News · Command Center
            </span>
            <h2 className="anr-ps-command-hero__title">Platform Settings</h2>
            <p className="anr-ps-command-hero__subtitle">
              AI Newsroom Operating System — real-time desk control, ingestion, and
              distribution orchestration.
            </p>
          </div>
          <div className="anr-ps-command-hero__status-row">
            <LiveIndicator label={m.ingestionLive ? "Ingestion live" : "Ingestion idle"} />
            <span className="anr-ps-sep" aria-hidden />
            <span className="anr-ps-health">
              <Zap size={13} aria-hidden />
              AI health {m.aiHealthScore}%
            </span>
            <button type="button" className="anr-ps-cmd-hint" onClick={onOpenCommand}>
              <kbd>⌘</kbd>
              <kbd>K</kbd>
            </button>
          </div>
        </div>

        <div className="anr-ps-hero-separator" aria-hidden>
          <motion.span
            className="anr-ps-hero-separator__glow"
            animate={{ x: ["-20%", "120%"] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <div className="anr-ps-hero-metrics">
          <HeroMetric label="Active AI agents" value={m.aiAgentsActive} accent pulse />
          <HeroMetric label="Articles today" value={m.processedToday} />
          <HeroMetric label="Breaking alerts" value={m.breakingCount} accent={m.breakingCount > 0} />
          <HeroMetric label="Newsroom uptime" value={m.uptimePct} suffix="%" />
          <HeroMetric
            label="Live pipelines"
            value={m.pipelinesLive}
            suffix={m.totalSources ? ` / ${m.totalSources}` : undefined}
          />
          <HeroMetric label="Articles / hour" value={m.articlesPerHour} />
        </div>

        {saving ? (
          <motion.div
            className="anr-ps-hero-sync"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="status"
          >
            <Bot size={14} className="anr-ps-spin" aria-hidden />
            Syncing configuration to Supabase…
          </motion.div>
        ) : (
          <div className="anr-ps-hero-pills">
            <span className="anr-ps-pill">
              <Activity size={12} aria-hidden />
              Desk nominal
            </span>
            {m.breakingCount > 0 ? (
              <span className="anr-ps-pill anr-ps-pill--alert">
                <AlertTriangle size={12} aria-hidden />
                {m.breakingCount} breaking
              </span>
            ) : null}
            <span className="anr-ps-pill">
              <Radio size={12} aria-hidden />
              {m.totalSources} sources monitored
            </span>
          </div>
        )}
      </div>
    </motion.section>
  );
}
