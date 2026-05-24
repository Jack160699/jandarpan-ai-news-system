"use client";

type MiniSparklineProps = {
  points: number[];
  direction?: "up" | "down" | "flat";
  className?: string;
};

export function MiniSparkline({
  points,
  direction = "flat",
  className = "",
}: MiniSparklineProps) {
  const w = 48;
  const h = 20;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points
    .map((p, i) => {
      const x = (i / (points.length - 1 || 1)) * w;
      const y = h - ((p - min) / range) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");

  const stroke =
    direction === "up"
      ? "var(--sm-up)"
      : direction === "down"
        ? "var(--sm-down)"
        : "var(--sm-muted)";

  return (
    <svg
      className={`sm-spark ${className}`.trim()}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
    </svg>
  );
}
