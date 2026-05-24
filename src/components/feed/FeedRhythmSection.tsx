import type { ReactNode } from "react";

type FeedRhythmSectionProps = {
  id?: string;
  title?: string;
  titleHi?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Softer section — no top rule, blends into stack */
  bleed?: boolean;
};

/**
 * Homepage feed section — consistent 20px rhythm and header spacing.
 */
export function FeedRhythmSection({
  id,
  title,
  titleHi,
  action,
  children,
  className = "",
  bleed = false,
}: FeedRhythmSectionProps) {
  return (
    <section
      id={id}
      className={`feed-section pl-scroll-target${bleed ? " feed-section--bleed" : ""}${className ? ` ${className}` : ""}`.trim()}
      aria-labelledby={title && id ? `${id}-title` : undefined}
    >
      {title ? (
        <header className="feed-section__header">
          <h2 id={id ? `${id}-title` : undefined} className="feed-section__title hi">
            {title}
            {titleHi ? (
              <span className="feed-section__title-hi">{titleHi}</span>
            ) : null}
          </h2>
          {action ? <div className="feed-section__action">{action}</div> : null}
        </header>
      ) : null}
      <div className="feed-section__body">{children}</div>
    </section>
  );
}
