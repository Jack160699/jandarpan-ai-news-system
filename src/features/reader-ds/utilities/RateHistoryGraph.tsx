"use client";

import { useId, useMemo, useState, type CSSProperties } from "react";
import type { HistoryRange, VerifiedHistoryPoint } from "@/lib/verified-rates/types";

const RANGE_LABELS: Record<HistoryRange, string> = {
  "7D": "7 दिन",
  "30D": "30 दिन",
  "90D": "90 दिन",
  "1Y": "1 वर्ष",
  MAX: "पूरा इतिहास",
};

type Props = {
  points: VerifiedHistoryPoint[];
  availableRanges: HistoryRange[];
  activeRange: HistoryRange;
  unitLabel: string;
  onRangeChange?: (range: HistoryRange) => void;
  categoryLabel: string;
};

/**
 * Lightweight accessible SVG rate graph — no fabricated smoothing.
 * Gaps are not connected across missing days.
 */
export function RateHistoryGraph({
  points,
  availableRanges,
  activeRange,
  unitLabel,
  onRangeChange,
  categoryLabel,
}: Props) {
  const gid = useId();
  const [focusIdx, setFocusIdx] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...points].sort((a, b) => a.date.localeCompare(b.date)),
    [points]
  );

  if (sorted.length === 0) {
    return (
      <div
        className="jd-rate-graph jd-rate-graph--empty"
        role="status"
        style={shellStyle}
      >
        <p style={{ margin: 0, color: "var(--jd-ink-2, #444)" }}>
          आज की दर फिलहाल सत्यापित नहीं हो सकी, और ऐतिहासिक डेटा उपलब्ध नहीं है।
        </p>
      </div>
    );
  }

  if (sorted.length === 1) {
    const p = sorted[0]!;
    return (
      <div className="jd-rate-graph jd-rate-graph--one" role="status" style={shellStyle}>
        <p style={{ margin: "0 0 8px", fontWeight: 600 }}>
          ₹{p.price} <span style={{ fontWeight: 400 }}>({unitLabel})</span>
        </p>
        <p style={{ margin: 0, color: "var(--jd-ink-2, #444)", fontSize: 14 }}>
          प्रभावी तिथि {p.date}. ऐतिहासिक ग्राफ के लिए सत्यापित दैनिक डेटा एकत्र किया जा
          रहा है।
        </p>
      </div>
    );
  }

  const width = 640;
  const height = 220;
  const pad = { t: 16, r: 12, b: 36, l: 48 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const values = sorted.map((p) => Number(p.price));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const coords = sorted.map((p, i) => {
    const x = pad.l + (i / (sorted.length - 1)) * innerW;
    const y = pad.t + (1 - (Number(p.price) - min) / span) * innerH;
    return { x, y, p };
  });

  // Segment polylines only across consecutive calendar... we don't invent days,
  // but we also must not imply continuity across large gaps: break when date gap > 1 day.
  const segments: string[] = [];
  let current: string[] = [];
  for (let i = 0; i < coords.length; i++) {
    const c = coords[i]!;
    if (i > 0) {
      const prev = sorted[i - 1]!;
      const gap = dayGap(prev.date, c.p.date);
      if (gap > 1) {
        if (current.length) segments.push(current.join(" "));
        current = [];
      }
    }
    current.push(`${c.x},${c.y}`);
  }
  if (current.length) segments.push(current.join(" "));

  const focus = focusIdx !== null ? coords[focusIdx] : null;
  const summary = `${categoryLabel}: ${sorted.length} सत्यापित बिंदु, न्यूनतम ₹${min}, अधिकतम ₹${max}, इकाई ${unitLabel}. लापता दिनों को जोड़ा नहीं गया।`;

  return (
    <div className="jd-rate-graph" style={shellStyle}>
      <div
        role="group"
        aria-label="समय सीमा"
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}
      >
        {(["7D", "30D", "90D", "1Y", "MAX"] as HistoryRange[]).map((r) => {
          const enabled = availableRanges.includes(r);
          const active = r === activeRange;
          return (
            <button
              key={r}
              type="button"
              disabled={!enabled}
              aria-pressed={active}
              onClick={() => enabled && onRangeChange?.(r)}
              style={{
                padding: "6px 10px",
                border: "1px solid var(--jd-line-2, #ccc)",
                background: active ? "var(--jd-navy, #1a2744)" : "transparent",
                color: active ? "#fff" : enabled ? "inherit" : "#999",
                cursor: enabled ? "pointer" : "not-allowed",
                fontSize: 13,
              }}
            >
              {RANGE_LABELS[r]}
            </button>
          );
        })}
      </div>

      <p id={`${gid}-summary`} className="sr-only">
        {summary}
      </p>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="auto"
        role="img"
        aria-labelledby={`${gid}-summary`}
        style={{ display: "block", maxWidth: "100%", overflow: "visible" }}
      >
        <title>{categoryLabel} ऐतिहासिक ग्राफ</title>
        {/* grid */}
        {[0, 0.5, 1].map((t) => {
          const y = pad.t + t * innerH;
          return (
            <line
              key={t}
              x1={pad.l}
              x2={width - pad.r}
              y1={y}
              y2={y}
              stroke="var(--jd-line-2, #ddd)"
              strokeDasharray="4 4"
            />
          );
        })}
        {segments.map((d, i) => (
          <polyline
            key={i}
            fill="none"
            stroke="var(--jd-navy, #1a2744)"
            strokeWidth={2}
            points={d}
          />
        ))}
        {coords.map((c, i) => (
          <circle
            key={c.p.date}
            cx={c.x}
            cy={c.y}
            r={focusIdx === i ? 5 : 3.5}
            fill={focusIdx === i ? "var(--jd-red, #b00020)" : "var(--jd-navy, #1a2744)"}
            tabIndex={0}
            role="listitem"
            aria-label={`${c.p.date}: ₹${c.p.price} ${unitLabel}`}
            onFocus={() => setFocusIdx(i)}
            onBlur={() => setFocusIdx(null)}
            onMouseEnter={() => setFocusIdx(i)}
            onMouseLeave={() => setFocusIdx(null)}
          />
        ))}
        <text x={pad.l} y={height - 10} fontSize={11} fill="var(--jd-ink-3, #666)">
          {sorted[0]!.date}
        </text>
        <text
          x={width - pad.r}
          y={height - 10}
          fontSize={11}
          textAnchor="end"
          fill="var(--jd-ink-3, #666)"
        >
          {sorted[sorted.length - 1]!.date}
        </text>
        <text x={4} y={pad.t + 4} fontSize={11} fill="var(--jd-ink-3, #666)">
          ₹{max}
        </text>
        <text x={4} y={pad.t + innerH} fontSize={11} fill="var(--jd-ink-3, #666)">
          ₹{min}
        </text>
      </svg>

      {focus ? (
        <p style={{ margin: "8px 0 0", fontSize: 14 }} aria-live="polite">
          {focus.p.date}: ₹{focus.p.price} ({unitLabel}) · स्रोत {focus.p.sourceCount}
        </p>
      ) : null}
    </div>
  );
}

function dayGap(a: string, b: string): number {
  const pa = a.split("-").map(Number);
  const pb = b.split("-").map(Number);
  const da = Date.UTC(pa[0]!, pa[1]! - 1, pa[2]!, 12);
  const db = Date.UTC(pb[0]!, pb[1]! - 1, pb[2]!, 12);
  return Math.round((db - da) / 86_400_000);
}

const shellStyle: CSSProperties = {
  border: "1px solid var(--jd-line-2, #ddd)",
  padding: 12,
  background: "var(--jd-paper, #fff)",
  minHeight: 120,
};
