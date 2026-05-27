import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  hint?: string;
  /** @deprecated Use `hint` */
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, hint, description, action }: EmptyStateProps) {
  const resolvedHint = hint ?? description;
  return (
    <div className="anr-empty">
      <p>{title}</p>
      {resolvedHint ? <p className="anr-meta">{resolvedHint}</p> : null}
      {action ? <div className="anr-empty__action">{action}</div> : null}
    </div>
  );
}
