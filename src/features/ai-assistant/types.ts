/**
 * JDP-007 — Reader AI Assistant types
 * UI-only contracts; wire to API handlers later.
 */

export type AiMessageRole = "user" | "assistant";

export type AiSource = {
  id: string;
  title: string;
  url: string;
  outlet?: string;
  publishedAt?: string;
  excerpt?: string;
};

export type AiTimelineEvent = {
  id: string;
  time: string;
  title: string;
  description?: string;
};

export type AiAnswer = {
  id: string;
  content: string;
  sources?: AiSource[];
  timeline?: AiTimelineEvent[];
  createdAt: string;
};

export type AiUserMessage = {
  id: string;
  role: "user";
  content: string;
  createdAt: string;
};

export type AiAssistantMessage = {
  id: string;
  role: "assistant";
  answer: AiAnswer;
  createdAt: string;
};

export type AiConversationMessage = AiUserMessage | AiAssistantMessage;

export type AiHistorySession = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  messageCount: number;
};

export type AiPromptSuggestion = {
  id: string;
  label: string;
  prompt: string;
};

export type AiSuggestedQuestion = {
  id: string;
  question: string;
  category?: string;
};

export type AiAssistantUiState = {
  activeSessionId: string | null;
  sessions: AiHistorySession[];
  messages: AiConversationMessage[];
  input: string;
  isLoading: boolean;
  isTyping: boolean;
};
