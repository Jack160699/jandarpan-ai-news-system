type StorySummaryBoxProps = {
  summary: string;
  confidence?: number | null;
};

export function StorySummaryBox({ summary, confidence }: StorySummaryBoxProps) {
  return (
    <aside
      className="immersive-summary story-summary-box"
      aria-labelledby="story-summary-title"
    >
      <div className="story-summary-box__head">
        <p id="story-summary-title" className="immersive-summary__label">
          AI editorial summary
        </p>
        {typeof confidence === "number" ? (
          <span className="story-summary-box__confidence" title="Desk confidence">
            {Math.round(confidence * 100)}% verified
          </span>
        ) : null}
      </div>
      <p className="immersive-summary__text story-deck">{summary}</p>
    </aside>
  );
}
