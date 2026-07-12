type StorySummaryBoxProps = {
  summary: string;
  title: string;
  aiLabel: string;
  transparencyTitle: string;
  readHint?: string;
};

export function StorySummaryBox({
  summary,
  title,
  aiLabel,
  transparencyTitle,
  readHint,
}: StorySummaryBoxProps) {
  return (
    <aside
      className="immersive-summary story-summary-box story-summary-box--premium"
      aria-labelledby="story-summary-title"
    >
      <div className="story-summary-box__head">
        <span className="story-ai-chip" title={transparencyTitle}>
          {aiLabel}
        </span>
        <p id="story-summary-title" className="immersive-summary__label">
          {title}
        </p>
        {readHint ? (
          <span className="story-summary-box__read-hint">{readHint}</span>
        ) : null}
      </div>
      <p className="immersive-summary__text story-deck">{summary}</p>
    </aside>
  );
}
