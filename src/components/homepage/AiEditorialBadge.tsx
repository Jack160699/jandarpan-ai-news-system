type AiEditorialBadgeProps = {
  compact?: boolean;
};

export function AiEditorialBadge({ compact = false }: AiEditorialBadgeProps) {
  return (
    <span
      className={`nr-badge-editorial ${compact ? "nr-badge-editorial--sm" : ""}`}
      aria-label="AI-edited editorial"
    >
      AI Editorial
    </span>
  );
}
