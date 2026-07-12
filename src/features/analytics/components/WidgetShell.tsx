import type { ReactNode } from "react";
import { cn } from "@/design-system/utils/cn";

export type WidgetShellProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  span?: "default" | "wide" | "kpi";
  children: ReactNode;
};

export function WidgetShell({
  title,
  subtitle,
  action,
  className,
  span = "default",
  children,
}: WidgetShellProps) {
  return (
    <section
      className={cn(
        "av3-widget",
        span === "wide" && "av3-widget--wide",
        span === "kpi" && "av3-widget--kpi",
        className
      )}
      aria-label={title}
    >
      <header className="av3-widget__head">
        <div>
          <h3 className="av3-widget__title">{title}</h3>
          {subtitle ? <p className="av3-widget__subtitle">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      <div className="av3-widget__body">{children}</div>
    </section>
  );
}
