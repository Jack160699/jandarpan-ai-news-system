import { useLanguage } from "@/providers/LanguageProvider";

type VerifiedBadgeProps = {
  variant?: "verified" | "reviewed" | "fast";
  compact?: boolean;
};

export function VerifiedBadge({
  variant = "reviewed",
  compact = false,
}: VerifiedBadgeProps) {
  const { t } = useLanguage();

  const label =
    variant === "verified"
      ? t.trust.verified
      : variant === "fast"
        ? t.trust.fastUpdates
        : t.trust.reviewed;

  return (
    <span
      className={`nr-verified nr-verified--${variant}${compact ? " nr-verified--compact" : ""}`}
      title={label}
    >
      {variant === "verified" ? (
        <span className="nr-verified__icon" aria-hidden>
          ✓
        </span>
      ) : null}
      <span className="nr-verified__label">{label}</span>
    </span>
  );
}
