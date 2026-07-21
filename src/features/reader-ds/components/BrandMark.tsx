/**
 * Approved Jan Darpan sunrise/mirror mark, rendered inline as a small chip.
 * Replaces the legacy standalone "ज" glyph mark across reader-ds chrome.
 * Geometry is the approved mark (public/brand/jan-darpan/mark/mark.svg) — pure
 * vector, no font dependency, crisp at any size.
 */
type BrandMarkProps = {
  /** Chip edge length in px. */
  size?: number;
  /** Chip corner radius in px. */
  radius?: number;
  /** Chip background (approved marks read best on a light chip over dark chrome). */
  background?: string;
  className?: string;
};

export function BrandMark({
  size = 22,
  radius = 5,
  background = "var(--jd-paper, #f7f4ec)",
  className,
}: BrandMarkProps) {
  const inner = Math.round(size * 0.82);
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <svg
        width={inner}
        height={inner}
        viewBox="0 0 100 100"
        role="img"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="50" cy="50" r="46" fill="none" stroke="#C9A24B" strokeWidth="1.4" opacity="0.55" />
        <circle cx="50" cy="38" r="6.2" fill="#C9A24B" />
        <path d="M22 54 A28 28 0 0 1 78 54 Z" fill="#C8102E" />
        <rect x="18.5" y="52.4" width="63" height="2.6" rx="1.3" fill="#C9A24B" />
        <path d="M25 57 A25 25 0 0 0 75 57 Z" fill="#C8102E" opacity="0.26" />
      </svg>
    </span>
  );
}
