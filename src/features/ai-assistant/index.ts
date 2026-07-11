/**
 * JDP-007 — Reader AI Assistant feature barrel
 */

export { AiAssistantExperience } from "./AiAssistantExperience";
export type { AiAssistantExperienceProps } from "./AiAssistantExperience";

export { ChatPanel } from "./components/ChatPanel";
export { PromptSuggestions } from "./components/PromptSuggestions";
export { Conversation } from "./components/Conversation";
export { AnswerCard } from "./components/AnswerCard";
export { SourceCard } from "./components/SourceCard";
export { TimelineCard } from "./components/TimelineCard";
export { Loading } from "./components/Loading";
export { Typing } from "./components/Typing";
export { History } from "./components/History";
export { EmptyState } from "./components/EmptyState";
export { SuggestedQuestions } from "./components/SuggestedQuestions";

export { useAiAssistantUi, useAiAssistantIds } from "./hooks/useAiAssistantUi";
export type { UseAiAssistantUiOptions, UseAiAssistantUiReturn } from "./hooks/useAiAssistantUi";

export type {
  AiAnswer,
  AiAssistantMessage,
  AiAssistantUiState,
  AiConversationMessage,
  AiHistorySession,
  AiMessageRole,
  AiPromptSuggestion,
  AiSource,
  AiSuggestedQuestion,
  AiTimelineEvent,
  AiUserMessage,
} from "./types";

export { isAiAssistantV3Enabled } from "@/lib/ai-assistant/config";
