"use client";

import { motion } from "framer-motion";
import { History } from "lucide-react";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { useNewsroomMetrics } from "@/components/admin-newsroom/platform-settings/hooks/useNewsroomMetrics";

export function ActivityTimeline() {
  const { activityItems } = useNewsroomMetrics();

  return (
    <motion.section
      className="anr-ps-timeline"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <header>
        <History size={15} aria-hidden />
        <h4>Recent activity</h4>
      </header>
      <ul>
        {activityItems.length ? (
          activityItems.map((item, i) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <span className="anr-ps-timeline__dot" aria-hidden />
              <div>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
                <ClientTime iso={item.at} preset="datetime" className="anr-meta" />
              </div>
            </motion.li>
          ))
        ) : (
          <li className="anr-meta">No recent desk events — awaiting ingestion.</li>
        )}
      </ul>
      <p className="anr-ps-timeline__audit anr-meta">Audit logs · full trail in Security center</p>
    </motion.section>
  );
}
