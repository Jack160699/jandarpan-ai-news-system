"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { GlowToggle } from "@/components/admin-newsroom/platform-settings/GlowToggle";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";

export function SettingsCard({
  id,
  title,
  description,
  icon: Icon,
  enabled,
  saving,
  statusText,
  updatedAt,
  onToggle,
  index,
}: {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  saving: boolean;
  statusText: string;
  updatedAt?: string;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.article
      className={`anr-ps-card ${enabled ? "anr-ps-card--on" : "anr-ps-card--off"}`}
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 28, delay: index * 0.04 }}
      whileHover={{
        y: -4,
        rotateX: 2,
        rotateY: -2,
        transition: { type: "spring", stiffness: 400, damping: 22 },
      }}
      style={{ transformPerspective: 900 }}
    >
      <span className="anr-ps-card__shimmer" aria-hidden />
      <motion.div
        className="anr-ps-card__icon"
        aria-hidden
        animate={enabled ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={{ duration: 2.4, repeat: enabled ? Infinity : 0 }}
      >
        <Icon size={18} strokeWidth={1.75} />
      </motion.div>
      <div className="anr-ps-card__body">
        <div className="anr-ps-card__title-row">
          <h4>{title}</h4>
          <span className={`anr-ps-chip ${enabled ? "anr-ps-chip--on" : ""}`}>
            {enabled ? "ON" : "OFF"}
          </span>
        </div>
        <p>{description}</p>
      </div>
      <div className="anr-ps-card__actions">
        <GlowToggle
          enabled={enabled}
          disabled={saving}
          onChange={onToggle}
          label={`Toggle ${title}`}
        />
      </div>
      <div className="anr-ps-card__footer">
        <div className="anr-ps-card__status">
          <span className="anr-ps-card__status-dot" aria-hidden />
          <span>{statusText}</span>
        </div>
        {updatedAt ? (
          <span className="anr-ps-card__updated">
            Updated <ClientTime iso={updatedAt} preset="time" />
          </span>
        ) : null}
      </div>
    </motion.article>
  );
}
