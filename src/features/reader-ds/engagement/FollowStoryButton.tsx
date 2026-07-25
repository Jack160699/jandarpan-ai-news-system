"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { isFollowing, toggleFollow } from "@/lib/engagement/follows";
import { useJdDsT } from "../i18n";

type FollowStoryButtonProps = {
  eventId?: string | null;
  articleId: string;
  label?: string;
};

/**
 * Lightweight follow for developing stories / events.
 * Prefers event id when available so updates group correctly.
 */
export function FollowStoryButton({
  eventId,
  articleId,
  label,
}: FollowStoryButtonProps) {
  const { t } = useJdDsT();
  const targetType = eventId ? "event" : "story";
  const targetId = eventId || articleId;
  const [epoch, setEpoch] = useState(0);

  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("storage", onStoreChange);
    return () => window.removeEventListener("storage", onStoreChange);
  }, []);

  const following = useSyncExternalStore(
    subscribe,
    () => {
      void epoch;
      return targetId ? isFollowing(targetType, targetId) : false;
    },
    () => false
  );

  if (!targetId) return null;

  return (
    <button
      type="button"
      className={following ? "jd-follow-btn is-on" : "jd-follow-btn"}
      data-testid="jd-follow-story"
      aria-pressed={following}
      onClick={() => {
        toggleFollow({
          targetType,
          targetId,
          label,
        });
        setEpoch((n) => n + 1);
      }}
    >
      {following ? t("follow.following") : t("follow.story")}
    </button>
  );
}
