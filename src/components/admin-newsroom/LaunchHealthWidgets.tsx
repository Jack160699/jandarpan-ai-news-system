"use client";

import { useCallback, useEffect, useState } from "react";
import type { LaunchHealthLevel, LaunchHealthWidget } from "@/lib/ops/launch-health";

const STATUS_CLASS: Record<LaunchHealthLevel, string> = {
  healthy: "anr-pulse-item--stable",
  degraded: "anr-pulse-item--warning",
  unhealthy: "anr-pulse-item--breaking",
};

const STATUS_LABEL: Record<LaunchHealthLevel, string> = {
  healthy: "Green",
  degraded: "Yellow",
  unhealthy: "Red",
};

export function LaunchHealthWidgets() {
  const [widgets, setWidgets] = useState<LaunchHealthWidget[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ops/health", { credentials: "include" });
      const json = (await res.json()) as { launchWidgets?: LaunchHealthWidget[] };
      setWidgets(json.launchWidgets ?? []);
    } catch {
      setWidgets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (loading) {
    return <p className="anr-meta">Loading launch health…</p>;
  }

  if (!widgets.length) return null;

  return (
    <section className="anr-health-ops__launch-strip" aria-label="Launch readiness">
      <h3 className="anr-meta m-0 mb-3 font-bold uppercase tracking-wide">
        Launch readiness
      </h3>
      <ul className="anr-health-ops__launch-grid">
        {widgets.map((w) => (
          <li
            key={w.id}
            className={`anr-pulse-item ${STATUS_CLASS[w.status]}`}
            title={w.detail}
          >
            <span className="anr-pulse-item__label">{w.label}</span>
            <span className="anr-pulse-item__value">{STATUS_LABEL[w.status]}</span>
            <span className="anr-meta block text-xs opacity-80">{w.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
