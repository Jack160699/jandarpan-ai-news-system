"use client";

import {
  useId,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type TableHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

/* --- Shared types --- */

export type Av3StatusTone =
  | "healthy"
  | "ok"
  | "live"
  | "success"
  | "warning"
  | "degraded"
  | "critical"
  | "danger"
  | "failed"
  | "offline"
  | "info"
  | "neutral"
  | "unknown"
  | "skipped"
  | "pending";

export type Av3TimelineStatus =
  | "complete"
  | "active"
  | "pending"
  | "warning"
  | "failed";

/* --- Helpers --- */

export function formatShortPath(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    const path = `${parsed.pathname}${parsed.search}` || "/";
    if (path.length <= 48) return path;
    return `${path.slice(0, 45)}...`;
  } catch {
    if (trimmed.length <= 48) return trimmed;
    return `${trimmed.slice(0, 45)}...`;
  }
}

export function normalizeStatusTone(status: string): Av3StatusTone {
  const key = status.trim().toLowerCase();
  if (
    key === "healthy" ||
    key === "ok" ||
    key === "live" ||
    key === "success" ||
    key === "passed"
  ) {
    return "healthy";
  }
  if (key === "warning") return "warning";
  if (key === "degraded") return "degraded";
  if (
    key === "critical" ||
    key === "danger" ||
    key === "failed" ||
    key === "offline" ||
    key === "unhealthy" ||
    key === "error"
  ) {
    return "critical";
  }
  if (key === "info") return "info";
  if (key === "skipped" || key === "skip") return "skipped";
  if (key === "pending" || key === "queued") return "pending";
  if (key === "unknown") return "unknown";
  return "neutral";
}

function statusBadgeClass(tone: Av3StatusTone): string {
  return `av3-status-badge av3-status-badge--${tone}`;
}

/* --- Metric --- */

export type Av3MetricProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Compact data-trust tooltip (source · period · freshness). */
  trustTitle?: string;
  trend?: { direction: "up" | "down" | "flat"; label?: string };
  className?: string;
};

export function Av3Metric({
  label,
  value,
  hint,
  trustTitle,
  trend,
  className,
}: Av3MetricProps) {
  return (
    <article className={cn("av3-metric", className)} title={trustTitle}>
      <p className="av3-metric__label">{label}</p>
      <p className="av3-metric__value">{value}</p>
      {hint ? <p className="av3-metric__hint">{hint}</p> : null}
      {trend && trend.direction !== "flat" ? (
        <span
          className={cn(
            "av3-metric__trend",
            trend.direction === "up" && "av3-metric__trend--up",
            trend.direction === "down" && "av3-metric__trend--down"
          )}
        >
          {trend.direction === "up" ? "+" : "-"}
          {trend.label ?? ""}
        </span>
      ) : null}
    </article>
  );
}

export type Av3MetricGridProps = HTMLAttributes<HTMLDivElement>;

export function Av3MetricGrid({ className, children, ...props }: Av3MetricGridProps) {
  return (
    <div className={cn("av3-metric-grid", className)} {...props}>
      {children}
    </div>
  );
}

/* --- Panel --- */

export type Av3PanelProps = {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

export function Av3Panel({
  title,
  subtitle,
  action,
  compact,
  className,
  bodyClassName,
  children,
}: Av3PanelProps) {
  return (
    <section
      className={cn("av3-panel", compact && "av3-panel--compact", className)}
      aria-label={title}
    >
      <header className="av3-panel__head">
        <div>
          <h3 className="av3-panel__title">{title}</h3>
          {subtitle ? <p className="av3-panel__subtitle">{subtitle}</p> : null}
        </div>
        {action ? <div className="av3-panel__action">{action}</div> : null}
      </header>
      <div className={cn("av3-panel__body", bodyClassName)}>{children}</div>
    </section>
  );
}

/* --- Status badge --- */

export type Av3StatusBadgeProps = {
  label: ReactNode;
  tone?: Av3StatusTone;
  status?: string;
  className?: string;
};

export function Av3StatusBadge({
  label,
  tone,
  status,
  className,
}: Av3StatusBadgeProps) {
  const resolved = tone ?? (status ? normalizeStatusTone(status) : "neutral");
  return (
    <span className={cn(statusBadgeClass(resolved), className)}>{label}</span>
  );
}

/* --- Health row --- */

export type Av3HealthRowProps = {
  label: string;
  status?: string;
  tone?: Av3StatusTone;
  statusLabel?: string;
  latencyMs?: number | string | null;
  message?: string | null;
  className?: string;
};

export function Av3HealthRow({
  label,
  status,
  tone,
  statusLabel,
  latencyMs,
  message,
  className,
}: Av3HealthRowProps) {
  const resolvedTone = tone ?? (status ? normalizeStatusTone(status) : "neutral");
  const badgeText = statusLabel ?? status ?? "unknown";

  return (
    <li className={cn("av3-health-row", className)}>
      <span className="av3-health-row__label">{label}</span>
      <div className="av3-health-row__meta">
        {latencyMs != null && latencyMs !== "" ? (
          <span className="av3-health-row__latency">{latencyMs}ms</span>
        ) : null}
        <Av3StatusBadge tone={resolvedTone} label={badgeText} />
      </div>
      {message ? (
        <p className="av3-health-row__message" title={message}>
          {message}
        </p>
      ) : null}
    </li>
  );
}

/* --- Empty state --- */

export type Av3EmptyStateProps = {
  title: string;
  message?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function Av3EmptyState({
  title,
  message,
  icon,
  action,
  className,
}: Av3EmptyStateProps) {
  return (
    <div className={cn("av3-empty", className)}>
      {icon ? <div className="av3-empty__icon">{icon}</div> : null}
      <h4 className="av3-empty__title">{title}</h4>
      {message ? <p className="av3-empty__message">{message}</p> : null}
      {action ? <div className="av3-empty__action">{action}</div> : null}
    </div>
  );
}

/* --- Skeleton --- */

export type Av3SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "line" | "title" | "metric" | "block";
};

export function Av3Skeleton({
  variant = "block",
  className,
  ...props
}: Av3SkeletonProps) {
  const variantClass =
    variant === "line"
      ? "av3-skeleton--line"
      : variant === "title"
        ? "av3-skeleton--title"
        : variant === "metric"
          ? "av3-skeleton--metric"
          : undefined;

  return (
    <div
      className={cn("av3-skeleton", variantClass, className)}
      aria-hidden
      {...props}
    />
  );
}

export type Av3SkeletonGridProps = {
  count?: number;
  className?: string;
};

export function Av3SkeletonGrid({ count = 6, className }: Av3SkeletonGridProps) {
  return (
    <div className={cn("av3-skeleton-grid", className)} aria-busy aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Av3Skeleton key={i} variant="metric" />
      ))}
    </div>
  );
}

/* --- Data table --- */

export type Av3DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  numeric?: boolean;
  truncate?: boolean;
  url?: boolean;
};

export type Av3DataTableProps<T> = {
  columns: Av3DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  empty?: ReactNode;
  className?: string;
  tableClassName?: string;
} & Omit<TableHTMLAttributes<HTMLTableElement>, "children">;

export function Av3DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  className,
  tableClassName,
  ...tableProps
}: Av3DataTableProps<T>) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className={cn("av3-table-wrap", className)}>
      <table className={cn("av3-table", tableClassName)} {...tableProps}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  col.numeric && "av3-table__num",
                  col.headerClassName
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    col.numeric && "av3-table__num",
                    col.truncate && "av3-table__truncate",
                    col.url && "av3-table__url",
                    col.cellClassName
                  )}
                >
                  {col.render(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --- Timeline --- */

export type Av3TimelineStage = {
  id: string;
  label: string;
  status: Av3TimelineStatus;
  detail?: ReactNode;
};

export type Av3TimelineProps = {
  stages: Av3TimelineStage[];
  className?: string;
};

export function Av3Timeline({ stages, className }: Av3TimelineProps) {
  return (
    <ol className={cn("av3-timeline", className)} aria-label="Pipeline stages">
      {stages.map((stage) => (
        <li
          key={stage.id}
          className={cn("av3-timeline__item", `av3-timeline__item--${stage.status}`)}
        >
          <span className="av3-timeline__marker" aria-hidden />
          <p className="av3-timeline__label">{stage.label}</p>
          {stage.detail ? (
            <p className="av3-timeline__detail">{stage.detail}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/* --- Disclosure --- */

export type Av3DisclosureProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  onOpenChange?: (open: boolean) => void;
};

export function Av3Disclosure({
  title,
  children,
  defaultOpen = false,
  className,
  onOpenChange,
}: Av3DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={cn("av3-disclosure", open && "av3-disclosure--open", className)}>
      <button
        type="button"
        className="av3-disclosure__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            onOpenChange?.(next);
            return next;
          });
        }}
      >
        <span>{title}</span>
        <span className="av3-disclosure__chevron" aria-hidden>
          &gt;
        </span>
      </button>
      <div id={panelId} className="av3-disclosure__panel" hidden={!open}>
        {children}
      </div>
    </div>
  );
}

/* --- Layout helpers --- */

export type Av3StackProps = HTMLAttributes<HTMLDivElement>;

export function Av3Stack({ className, children, ...props }: Av3StackProps) {
  return (
    <div className={cn("av3-stack", className)} {...props}>
      {children}
    </div>
  );
}

export type Av3HeroProps = {
  title: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  tone?: string;
  className?: string;
};

export function Av3Hero({ title, meta, badge, action, tone = "neutral", className }: Av3HeroProps) {
  return (
    <section className={cn("av3-hero", `av3-hero--${tone}`, className)}>
      <div className="av3-hero__main">
        {badge}
        <h2 className="av3-hero__title">{title}</h2>
        {meta ? <div className="av3-hero__meta">{meta}</div> : null}
      </div>
      {action ? <div className="av3-hero__action">{action}</div> : null}
    </section>
  );
}

export type Av3Reason = {
  id: string;
  title: string;
  detail: string;
  severity: string;
};

export function Av3ReasonList({ reasons }: { reasons: Av3Reason[] }) {
  if (reasons.length === 0) return null;
  return (
    <ul className="av3-reason-list">
      {reasons.map((r) => (
        <li
          key={r.id}
          className={cn("av3-reason-list__item", `av3-reason-list__item--${r.severity}`)}
        >
          <strong>{r.title}</strong>
          <span>{r.detail}</span>
        </li>
      ))}
    </ul>
  );
}

export type Av3TabsProps = {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
  className?: string;
};

export function Av3Tabs({ tabs, active, onChange, className }: Av3TabsProps) {
  return (
    <div className={cn("av3-tabs", className)} role="tablist" aria-label="Sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={cn("av3-tabs__btn", active === tab.id && "av3-tabs__btn--active")}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function truncateText(text: string, max = 80): string {
  if (!text) return "—";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
