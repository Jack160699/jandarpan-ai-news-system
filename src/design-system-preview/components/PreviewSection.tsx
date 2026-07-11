import type { ReactNode } from "react";

type PreviewSectionProps = {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function PreviewSection({ id, title, description, children }: PreviewSectionProps) {
  return (
    <section id={id} className="jds-preview__section">
      <header className="jds-preview__section-header">
        <h2 className="jds-preview__section-title">{title}</h2>
        {description ? <p className="jds-preview__section-desc">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

type PreviewPanelProps = {
  label?: string;
  children: ReactNode;
};

export function PreviewPanel({ label, children }: PreviewPanelProps) {
  return (
    <div className="jds-preview__panel">
      {label ? <p className="jds-preview__panel-label">{label}</p> : null}
      {children}
    </div>
  );
}
