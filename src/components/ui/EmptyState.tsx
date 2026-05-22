import { cn } from "@/lib/cn";

type EmptyStateProps = {
  kicker?: string;
  title: string;
  description?: React.ReactNode;
  icon?: string;
  children?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  kicker,
  title,
  description,
  icon = "◌",
  children,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("ds-empty", className)} role="status">
      {kicker ? <p className="ds-kicker">{kicker}</p> : null}
      <div className="ds-empty__icon" aria-hidden>
        {icon}
      </div>
      <h2 className="ds-empty__title">{title}</h2>
      {description ? <div className="ds-empty__text">{description}</div> : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
