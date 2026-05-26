"use client";

import { motion, type Variants } from "framer-motion";
import {
  Activity,
  AtSign,
  Cloud,
  Database,
  Send,
  Smartphone,
  Video,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNewsroomMetrics } from "@/components/admin-newsroom/platform-settings/hooks/useNewsroomMetrics";
import { useAnimatedCounter } from "@/components/admin-newsroom/platform-settings/hooks/useAnimatedCounter";
import { LiveIndicator } from "@/components/admin-newsroom/ui/LiveIndicator";

const stagger: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, type: "spring" as const, stiffness: 320, damping: 28 },
  }),
};

function AnimatedStat({ value }: { value: number }) {
  const n = useAnimatedCounter(value);
  return <strong>{Math.round(n).toLocaleString("en-IN")}</strong>;
}

export function OperationsRail() {
  const m = useNewsroomMetrics();

  return (
    <aside className="anr-ps-rail" aria-label="Real-time operations monitor">
      <motion.div className="anr-ps-widget" custom={0} variants={stagger} initial="hidden" animate="show">
        <header className="anr-ps-widget__head">
          <h4>AI Agent Cluster</h4>
          <LiveIndicator label="Live" />
        </header>
        <div className="anr-ps-widget__body">
          <ul className="anr-ps-agents">
            {m.agentCluster.map((agent) => (
              <li key={agent.id} className={`anr-ps-agent anr-ps-agent--${agent.status}`}>
                <span className="anr-ps-agent__dot" aria-hidden />
                <div>
                  <strong>{agent.name}</strong>
                  <span>{agent.status}</span>
                </div>
                {agent.active ? (
                  <motion.span
                    className="anr-ps-agent__pulse"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                    aria-hidden
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      <motion.div className="anr-ps-widget" custom={1} variants={stagger} initial="hidden" animate="show">
        <header className="anr-ps-widget__head">
          <h4>Content Velocity</h4>
          <Activity size={14} aria-hidden />
        </header>
        <div className="anr-ps-widget__body">
          <div className="anr-ps-metric">
            <span>Articles / hour</span>
            <AnimatedStat value={m.articlesPerHour} />
          </div>
          <div className="anr-ps-chart anr-ps-chart--tall">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={m.velocityChart}>
                <defs>
                  <linearGradient id="psVelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff5c38" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ff5c38" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "#0c0c10",
                    border: "1px solid rgba(255,92,56,0.25)",
                    borderRadius: 10,
                    fontSize: 11,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="articles"
                  stroke="#ff5c38"
                  strokeWidth={2}
                  fill="url(#psVelGrad)"
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      <motion.div className="anr-ps-widget" custom={2} variants={stagger} initial="hidden" animate="show">
        <header className="anr-ps-widget__head">
          <h4>Breaking News Heatmap</h4>
        </header>
        <div className="anr-ps-widget__body">
          <div className="anr-ps-heatmap">
            {m.districtHeatmap.map((d) => (
              <div
                key={d.name}
                className={`anr-ps-heatmap__cell ${d.active ? "anr-ps-heatmap__cell--hot" : ""}`}
                style={{ "--heat": `${d.intensity}%` } as React.CSSProperties}
                title={`${d.name}: ${d.intensity}% activity`}
              >
                <span>{d.name}</span>
                <em>{d.intensity}</em>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div className="anr-ps-widget" custom={3} variants={stagger} initial="hidden" animate="show">
        <header className="anr-ps-widget__head">
          <h4>System Infrastructure</h4>
          <Database size={14} aria-hidden />
        </header>
        <div className="anr-ps-widget__body">
          <div className="anr-ps-infra-bar">
            <span>Supabase latency</span>
            <div className="anr-ps-infra-bar__track">
              <motion.div
                className="anr-ps-infra-bar__fill"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, m.supabaseLatencyMs / 2)}%` }}
              />
            </div>
            <strong>{m.supabaseLatencyMs}ms</strong>
          </div>
          <div className="anr-ps-infra-bar">
            <span>API health</span>
            <div className="anr-ps-infra-bar__track">
              <motion.div
                className="anr-ps-infra-bar__fill anr-ps-infra-bar__fill--ok"
                animate={{ width: `${m.aiHealthScore}%` }}
              />
            </div>
            <strong>{m.aiHealthScore}%</strong>
          </div>
          <div className="anr-ps-infra-bar">
            <span>Queue load</span>
            <div className="anr-ps-infra-bar__track">
              <motion.div
                className={`anr-ps-infra-bar__fill ${m.queueLoad > 60 ? "anr-ps-infra-bar__fill--warn" : ""}`}
                animate={{ width: `${m.queueLoad}%` }}
              />
            </div>
            <strong>{m.queueLoad}%</strong>
          </div>
          <div className="anr-ps-infra-bar">
            <span>
              <Cloud size={11} aria-hidden /> CDN response
            </span>
            <div className="anr-ps-infra-bar__track">
              <motion.div
                className="anr-ps-infra-bar__fill anr-ps-infra-bar__fill--ok"
                animate={{ width: `${100 - m.cdnResponseMs}%` }}
              />
            </div>
            <strong>{m.cdnResponseMs}ms</strong>
          </div>
        </div>
      </motion.div>

      <motion.div className="anr-ps-widget" custom={4} variants={stagger} initial="hidden" animate="show">
        <header className="anr-ps-widget__head">
          <h4>Social Distribution</h4>
        </header>
        <div className="anr-ps-widget__body anr-ps-social">
          <div className="anr-ps-social__row">
            <Video size={14} aria-hidden />
            <span>YouTube pushes</span>
            <AnimatedStat value={m.socialStats.youtube} />
          </div>
          <div className="anr-ps-social__row">
            <Smartphone size={14} aria-hidden />
            <span>Instagram reels</span>
            <AnimatedStat value={m.socialStats.instagram} />
          </div>
          <div className="anr-ps-social__row">
            <Send size={14} aria-hidden />
            <span>WhatsApp delivery</span>
            <AnimatedStat value={m.socialStats.whatsapp} />
          </div>
          <div className="anr-ps-social__row">
            <AtSign size={14} aria-hidden />
            <span>X engagement</span>
            <AnimatedStat value={m.socialStats.xEngagement} />
          </div>
        </div>
      </motion.div>
    </aside>
  );
}
