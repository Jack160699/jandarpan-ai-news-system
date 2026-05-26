import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  hint?: string;
  action?: ReactNode;
};

export function EmptyState({ title, hint, action }: EmptyStateProps) {
  return (
    <div className="anr-empty">
      <p>{title}</p>
      {hint ? <p className="anr-meta">{hint}</p> : null}
      {action ? <div className="anr-empty__action">{action}</div> : null}
    </div>
  );
}
