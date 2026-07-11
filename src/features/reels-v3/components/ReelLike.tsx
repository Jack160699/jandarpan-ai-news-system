"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useMotionConfig } from "@/design-system/motion";
import { focusRingClass } from "@/design-system/utils/aria";
import { cn } from "@/lib/cn";
import { toggleReelLike, isReelLiked } from "../lib/likes";
import { useLanguage } from "@/providers/LanguageProvider";

type ReelLikeProps = {
  slug: string;
  className?: string;
};

/**
 * JDP-017 — Like action with haptic-style micro-animation
 */
export function ReelLike({ slug, className }: ReelLikeProps) {
  const { t } = useLanguage();
  const { reduced, transition } = useMotionConfig();
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    setLiked(isReelLiked(slug));
  }, [slug]);

  const handleClick = () => {
    setLiked(toggleReelLike(slug));
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(liked ? 2 : 8);
    }
  };

  return (
    <button
      type="button"
      className={cn(
        "reels-v3-action tap-target",
        liked && "reels-v3-action--on",
        focusRingClass,
        className
      )}
      onClick={handleClick}
      aria-label={liked ? t.cardActions.liked : t.cardActions.like}
      aria-pressed={liked}
    >
      <motion.span
        className="reels-v3-action__icon"
        aria-hidden
        animate={
          reduced
            ? undefined
            : liked
              ? { scale: [1, 1.35, 1] }
              : { scale: 1 }
        }
        transition={transition("fast")}
      >
        <Heart
          size={22}
          strokeWidth={2}
          fill={liked ? "currentColor" : "none"}
        />
      </motion.span>
    </button>
  );
}
