import Link from "next/link";

export type ChipItem = {
  label: string;
  href?: string;
};

type ChipRowProps = {
  chips: ChipItem[];
  activeIndex?: number;
  bordered?: boolean;
};

/** Horizontal filter / topic chips — approved A3/A5 atom. */
export function ChipRow({ chips, activeIndex = 0, bordered = false }: ChipRowProps) {
  return (
    <div
      className="jd-ui"
      style={{
        flexShrink: 0,
        display: "flex",
        gap: 8,
        overflowX: "auto",
        padding: "9px 14px",
        background: bordered ? "#fff" : "var(--jd-paper-2)",
        borderBottom: bordered ? "1px solid var(--jd-line)" : "1px solid var(--jd-line)",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {chips.map((chip, i) => {
        const active = i === activeIndex;
        const style = {
          flexShrink: 0,
          fontSize: 12.5,
          fontWeight: active ? 800 : 600,
          color: active ? "#fff" : "var(--jd-navy)",
          background: active ? "var(--jd-navy)" : "transparent",
          border: active ? "1px solid var(--jd-navy)" : "1px solid var(--jd-line)",
          borderRadius: 2,
          padding: "7px 12px",
          textDecoration: "none" as const,
          whiteSpace: "nowrap" as const,
        };
        if (chip.href) {
          return (
            <Link key={chip.label} href={chip.href} style={style}>
              {chip.label}
            </Link>
          );
        }
        return (
          <span key={chip.label} style={style}>
            {chip.label}
          </span>
        );
      })}
    </div>
  );
}
