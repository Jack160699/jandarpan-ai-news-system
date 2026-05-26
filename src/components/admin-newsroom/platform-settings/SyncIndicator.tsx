"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, CloudUpload, Loader2 } from "lucide-react";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";

export function SyncIndicator({
  saving,
  lastSavedAt,
}: {
  saving: boolean;
  lastSavedAt: Date | null;
}) {
  return (
    <AnimatePresence mode="wait">
      {saving ? (
        <motion.div
          key="sync"
          className="anr-ps-sync anr-ps-sync--busy"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          role="status"
        >
          <Loader2 size={13} className="anr-ps-spin" aria-hidden />
          Realtime sync…
        </motion.div>
      ) : lastSavedAt ? (
        <motion.div
          key="saved"
          className="anr-ps-sync anr-ps-sync--ok"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          role="status"
        >
          <Check size={13} aria-hidden />
          Saved <ClientTime iso={lastSavedAt.toISOString()} preset="time" />
          <CloudUpload size={12} aria-hidden />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
