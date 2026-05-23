"use client";

import { useLanguage } from "@/providers/LanguageProvider";

type StoryAiTransparencyProps = {
  sourceCount?: number;
};

/** Editorial trust note — no internal scores or AI branding */
export function StoryAiTransparency({
  sourceCount = 1,
}: StoryAiTransparencyProps) {
  const { t } = useLanguage();

  return (
    <aside className="story-desk-note" aria-label="Editorial standards">
      <div className="story-desk-note__mast">
        <span className="story-desk-note__mark" aria-hidden>
          ✓
        </span>
        <p className="story-desk-note__kicker">{t.story.deskNoteKicker}</p>
      </div>
      <p className="story-desk-note__text">
        {t.story.deskNoteBody}
        {sourceCount > 1
          ? ` ${sourceCount} verified sources informed this report.`
          : null}
      </p>
      <p className="story-desk-note__fine">{t.story.deskNoteFine}</p>
    </aside>
  );
}
