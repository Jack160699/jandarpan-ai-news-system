"use client";

import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { useMemo } from "react";

export function AiRecommendations({
  settings,
}: {
  settings: Record<string, boolean>;
}) {
  const tips = useMemo(() => {
    const list: string[] = [];
    if (settings.auto_publish && !settings.fact_verification_layer) {
      list.push("Enable Fact Verification Layer before Auto Publish goes live.");
    }
    if (settings.ai_rewrite_engine && !settings.human_approval_queue) {
      list.push("Pair AI Rewrite with Human Approval Queue for sensitive desks.");
    }
    if (!settings.push_notifications && settings.auto_publish) {
      list.push("Turn on Push Notifications to capitalize on breaking velocity.");
    }
    if (!settings.supabase_monitoring) {
      list.push("Re-enable Supabase monitoring — infrastructure alerts are muted.");
    }
    if (!list.length) {
      list.push("Configuration is balanced. AI pipelines and governance are aligned.");
    }
    return list.slice(0, 3);
  }, [settings]);

  return (
    <motion.aside
      className="anr-ps-recommend"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 }}
    >
      <header>
        <Lightbulb size={15} aria-hidden />
        <h4>AI Recommendations</h4>
      </header>
      <ul>
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </motion.aside>
  );
}
