type StoryAiTransparencyProps = {
  sourceCount?: number;
  confidence?: number | null;
};

export function StoryAiTransparency({
  sourceCount = 1,
  confidence,
}: StoryAiTransparencyProps) {
  const confidenceLabel =
    typeof confidence === "number"
      ? `${Math.round(confidence * 100)}% desk confidence`
      : null;

  return (
    <aside className="story-ai-note" aria-label="How this story was produced">
      <p className="story-ai-note__title">AI newsroom transparency</p>
      <p className="story-ai-note__text">
        This article was written by our editorial AI desk using {sourceCount}{" "}
        {sourceCount === 1 ? "verified public source" : "verified public sources"}.
        Facts are drawn from wire and regional signals; the desk synthesizes and
        fact-checks before publish. {confidenceLabel ? `${confidenceLabel}.` : ""}
        Corrections: editorial@regionaldesk.local
      </p>
    </aside>
  );
}
