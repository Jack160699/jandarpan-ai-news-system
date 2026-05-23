"use client";

import { useHaptic } from "@/hooks/useHaptic";

type BookmarkButtonProps = {
  saved: boolean;
  onToggle: () => void;
  className?: string;
  label?: string;
  labelSaved?: string;
  size?: "sm" | "md";
};

export function BookmarkButton({
  saved,
  onToggle,
  className = "",
  label = "Save",
  labelSaved = "Saved",
  size = "md",
}: BookmarkButtonProps) {
  const haptic = useHaptic();

  const handleClick = () => {
    haptic(saved ? "light" : "success");
    onToggle();
  };

  return (
    <button
      type="button"
      className={`bookmark-btn bookmark-btn--${size} tap-press${saved ? " bookmark-btn--saved" : ""} ${className}`.trim()}
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? labelSaved : label}
    >
      <span className="bookmark-btn__icon" aria-hidden>
        <svg
          className="bookmark-btn__svg"
          viewBox="0 0 24 24"
          width={size === "sm" ? 18 : 22}
          height={size === "sm" ? 18 : 22}
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
      </span>
      {label ? (
        <span className="bookmark-btn__label">{saved ? labelSaved : label}</span>
      ) : null}
    </button>
  );
}
