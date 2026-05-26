"use client";

import { motion } from "framer-motion";

type MetricCardProps = {
  label: string;
  value: string | number;
  trend?: string;
};

export function MetricCard({ label, value, trend }: MetricCardProps) {
  return (
    <motion.article
      className="anr-kpi"
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.16 }}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      {trend ? <small className="anr-meta">{trend}</small> : null}
    </motion.article>
  );
}
