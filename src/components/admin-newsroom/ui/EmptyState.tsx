type EmptyStateProps = {
  title: string;
  hint?: string;
};

export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div className="anr-empty">
      <p>{title}</p>
      {hint ? <p className="anr-meta">{hint}</p> : null}
    </div>
  );
}
