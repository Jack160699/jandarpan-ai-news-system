"use client";

import { EditorAiIntakeSubTabs } from "./EditorAiIntakeSubTabs";
import { IntakeDraftCard } from "./IntakeDraftCard";
import { IntakeJobList } from "./IntakeJobList";
import { LinkIntakePanel } from "./LinkIntakePanel";
import { PromptIntakePanel } from "./PromptIntakePanel";
import { TextIntakePanel } from "./TextIntakePanel";
import type { useAiIntake } from "../useAiIntake";

type IntakePanelProps = ReturnType<typeof useAiIntake>;

export function IntakePanel({
  intakeMode,
  setIntakeMode,
  intakePrompt,
  setIntakePrompt,
  linkUrl,
  setLinkUrl,
  rawText,
  setRawText,
  intakeSteps,
  draft,
  isIntakeRunning,
  isCoverRunning,
  intakeError,
  runIntake,
  retryIntake,
  generateCover,
  applyDraft,
  clearDraft,
}: IntakePanelProps) {
  const submit = () => void runIntake(intakeMode);

  return (
    <div className="jd-ai-panel-body jd-ai-intake">
      <p className="jd-ai-intake__intro">
        Paste text or a link, or write a short brief. Fast text draft — headline, body, tags, SEO, social. Cover image is optional.
      </p>
      <EditorAiIntakeSubTabs active={intakeMode} onChange={setIntakeMode} />

      {intakeMode === "text" ? (
        <TextIntakePanel
          value={rawText}
          onChange={setRawText}
          onSubmit={submit}
          disabled={isIntakeRunning}
        />
      ) : null}
      {intakeMode === "link" ? (
        <LinkIntakePanel
          url={linkUrl}
          onChange={setLinkUrl}
          onSubmit={submit}
          disabled={isIntakeRunning}
        />
      ) : null}
      {intakeMode === "prompt" ? (
        <PromptIntakePanel
          value={intakePrompt}
          onChange={setIntakePrompt}
          onSubmit={submit}
          disabled={isIntakeRunning}
        />
      ) : null}

      {intakeError ? (
        <div className="jd-ai-intake__error-wrap" role="alert">
          <p className="jd-ai-intake__error">{intakeError}</p>
          <button
            type="button"
            className="anr-btn anr-btn--ghost jd-ai-intake__retry"
            disabled={isIntakeRunning}
            onClick={() => retryIntake()}
          >
            Retry
          </button>
        </div>
      ) : null}

      <IntakeJobList steps={intakeSteps} />

      {draft ? (
        <IntakeDraftCard
          draft={draft}
          onApply={() => applyDraft(draft)}
          onDismiss={clearDraft}
          onGenerateCover={() => void generateCover()}
          isCoverRunning={isCoverRunning}
        />
      ) : null}
    </div>
  );
}
