"use client";

import { useAiAssistantIds, useAiAssistantUi } from "./hooks/useAiAssistantUi";
import { ChatPanel } from "./components/ChatPanel";
import { useIsDesktop } from "@/design-system/hooks";
import "./styles/ai-assistant.css";

export type AiAssistantExperienceProps = {
  className?: string;
};

/**
 * JDP-007 — Reader AI Assistant experience shell.
 * UI-only; wire `useAiAssistantUi({ onSendMessage })` to live APIs later.
 */
export function AiAssistantExperience({ className }: AiAssistantExperienceProps) {
  const isDesktop = useIsDesktop();
  const ids = useAiAssistantIds();
  const ui = useAiAssistantUi();

  return (
    <div className={`ai-v3-root jds-root ${className ?? ""}`.trim()}>
      <ChatPanel
        conversationId={ids.conversationId}
        historyId={ids.historyId}
        inputId={ids.inputId}
        messages={ui.messages}
        input={ui.input}
        onInputChange={ui.setInput}
        onSubmit={ui.submitInput}
        isLoading={ui.isLoading}
        isTyping={ui.isTyping}
        promptSuggestions={ui.promptSuggestions}
        suggestedQuestions={ui.suggestedQuestions}
        onPromptSelect={ui.applySuggestion}
        onAskQuestion={ui.askQuestion}
        onNewChat={ui.startNewSession}
        sessions={ui.sessions}
        activeSessionId={ui.activeSessionId}
        onSessionSelect={ui.selectSession}
        historyOpen={ui.historyOpen}
        onHistoryToggle={() => ui.setHistoryOpen((o) => !o)}
        onHistoryClose={() => ui.setHistoryOpen(false)}
        showHistorySidebar={isDesktop}
        className="ai-v3-experience"
      />
    </div>
  );
}
