"use client";

import { FormEvent, KeyboardEvent } from "react";
import { ArrowUp, History as HistoryIcon, Sparkles } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { Conversation } from "./Conversation";
import { History } from "./History";
import { PromptSuggestions } from "./PromptSuggestions";
import type {
  AiConversationMessage,
  AiHistorySession,
  AiPromptSuggestion,
  AiSuggestedQuestion,
} from "../types";

export type ChatPanelProps = {
  conversationId?: string;
  historyId?: string;
  inputId?: string;
  messages: AiConversationMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  isTyping?: boolean;
  disabled?: boolean;
  promptSuggestions?: AiPromptSuggestion[];
  suggestedQuestions?: AiSuggestedQuestion[];
  onPromptSelect?: (prompt: string) => void;
  onAskQuestion?: (question: string) => void;
  onNewChat?: () => void;
  /** History */
  sessions?: AiHistorySession[];
  activeSessionId?: string | null;
  onSessionSelect?: (sessionId: string) => void;
  historyOpen?: boolean;
  onHistoryToggle?: () => void;
  onHistoryClose?: () => void;
  showHistorySidebar?: boolean;
  className?: string;
};

/**
 * Main chat surface: history, conversation feed, prompts, and composer.
 */
export function ChatPanel({
  conversationId,
  historyId,
  inputId,
  messages,
  input,
  onInputChange,
  onSubmit,
  isLoading,
  isTyping,
  disabled,
  promptSuggestions = [],
  suggestedQuestions = [],
  onPromptSelect,
  onAskQuestion,
  onNewChat,
  sessions = [],
  activeSessionId = null,
  onSessionSelect,
  historyOpen,
  onHistoryToggle,
  onHistoryClose,
  showHistorySidebar,
  className,
}: ChatPanelProps) {
  const isComposerDisabled = disabled || isTyping;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || isComposerDisabled) return;
    onSubmit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || isComposerDisabled) return;
      onSubmit();
    }
  }

  return (
    <section
      className={cn("ai-v3-chat", className)}
      aria-label="AI assistant chat"
    >
      {showHistorySidebar && onSessionSelect && onNewChat && (
        <History
          id={historyId}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={onSessionSelect}
          onNewChat={onNewChat}
          variant="sidebar"
          className="ai-v3-chat__history-sidebar"
        />
      )}

      {historyOpen && onHistoryClose && onSessionSelect && onNewChat && (
        <>
          <button
            type="button"
            className="ai-v3-chat__backdrop"
            aria-label="Close history overlay"
            onClick={onHistoryClose}
          />
          <History
            id={historyId}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelect={onSessionSelect}
            onNewChat={onNewChat}
            onClose={onHistoryClose}
            variant="drawer"
            className="ai-v3-chat__history-drawer"
          />
        </>
      )}

      <div className="ai-v3-chat__main">
        <header className="ai-v3-chat__header">
          <div className="ai-v3-chat__brand">
            <Sparkles size={18} aria-hidden />
            <h1 className="ai-v3-chat__title">Jan Darpan AI</h1>
          </div>
          {onHistoryToggle && !showHistorySidebar && (
            <button
              type="button"
              className="ai-v3-chat__history-btn jds-focus-ring"
              onClick={onHistoryToggle}
              aria-expanded={historyOpen}
              aria-controls={historyId}
            >
              <HistoryIcon size={18} aria-hidden />
              <span className="ai-v3-chat__history-btn-label">History</span>
            </button>
          )}
        </header>

        <Conversation
          id={conversationId}
          messages={messages}
          isLoading={isLoading}
          isTyping={isTyping}
          suggestedQuestions={suggestedQuestions}
          onNewChat={onNewChat}
          onAskQuestion={onAskQuestion}
          className="ai-v3-chat__conversation"
        />

        <footer className="ai-v3-chat__composer">
          {onPromptSelect && (
            <PromptSuggestions
              suggestions={promptSuggestions}
              onSelect={onPromptSelect}
              disabled={isComposerDisabled}
            />
          )}

          <form className="ai-v3-chat__form" onSubmit={handleSubmit}>
            <label htmlFor={inputId} className="sr-only">
              Ask a question
            </label>
            <textarea
              id={inputId}
              className="ai-v3-chat__input jds-focus-ring"
              rows={1}
              placeholder="Ask about news, summaries, or timelines…"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isComposerDisabled}
              aria-disabled={isComposerDisabled || undefined}
            />
            <button
              type="submit"
              className="ai-v3-chat__send jds-focus-ring"
              disabled={!input.trim() || isComposerDisabled}
              aria-label="Send message"
            >
              <ArrowUp size={18} aria-hidden />
            </button>
          </form>

          <p className="ai-v3-chat__disclaimer">
            AI responses are for preview. Verify facts with linked sources.
          </p>
        </footer>
      </div>
    </section>
  );
}
