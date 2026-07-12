"use client";

import { useCallback, useId, useState } from "react";
import {
  MOCK_HISTORY_SESSIONS,
  MOCK_PROMPT_SUGGESTIONS,
  MOCK_SUGGESTED_QUESTIONS,
  createMockAnswer,
} from "../mock-data";
import type {
  AiConversationMessage,
  AiHistorySession,
  AiPromptSuggestion,
  AiSuggestedQuestion,
} from "../types";

const TYPING_DELAY_MS = 900;

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export type UseAiAssistantUiOptions = {
  /** Replace mock send with real API call */
  onSendMessage?: (message: string) => Promise<void>;
};

export function useAiAssistantUi(options: UseAiAssistantUiOptions = {}) {
  const [sessions, setSessions] = useState<AiHistorySession[]>(MOCK_HISTORY_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const promptSuggestions: AiPromptSuggestion[] = MOCK_PROMPT_SUGGESTIONS;
  const suggestedQuestions: AiSuggestedQuestion[] = MOCK_SUGGESTED_QUESTIONS;

  const startNewSession = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setInput("");
    setHistoryOpen(false);
  }, []);

  const selectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setMessages([]);
    setHistoryOpen(false);
    setIsLoading(true);
    // Mock: simulate loading prior conversation
    window.setTimeout(() => setIsLoading(false), 400);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      const userMessage: AiConversationMessage = {
        id: makeId("user"),
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsTyping(true);

      if (options.onSendMessage) {
        try {
          await options.onSendMessage(trimmed);
        } finally {
          setIsTyping(false);
        }
        return;
      }

      // Mock response path
      await new Promise((r) => window.setTimeout(r, TYPING_DELAY_MS));

      const answer = createMockAnswer(trimmed);
      const assistantMessage: AiConversationMessage = {
        id: makeId("assistant"),
        role: "assistant",
        answer,
        createdAt: answer.createdAt,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);

      if (!activeSessionId) {
        const sessionId = makeId("sess");
        const newSession: AiHistorySession = {
          id: sessionId,
          title: trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed,
          preview: answer.content.slice(0, 80) + "…",
          updatedAt: answer.createdAt,
          messageCount: 2,
        };
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(sessionId);
      }
    },
    [activeSessionId, isTyping, options]
  );

  const submitInput = useCallback(() => {
    void sendMessage(input);
  }, [input, sendMessage]);

  const applySuggestion = useCallback(
    (prompt: string) => {
      setInput(prompt);
    },
    []
  );

  const askQuestion = useCallback(
    (question: string) => {
      void sendMessage(question);
    },
    [sendMessage]
  );

  return {
    sessions,
    activeSessionId,
    messages,
    input,
    setInput,
    isLoading,
    isTyping,
    historyOpen,
    setHistoryOpen,
    promptSuggestions,
    suggestedQuestions,
    startNewSession,
    selectSession,
    sendMessage,
    submitInput,
    applySuggestion,
    askQuestion,
  };
}

export type UseAiAssistantUiReturn = ReturnType<typeof useAiAssistantUi>;

/** Stable id for aria relationships in the experience shell */
export function useAiAssistantIds() {
  const base = useId();
  return {
    panelId: `${base}-panel`,
    conversationId: `${base}-conversation`,
    inputId: `${base}-input`,
    historyId: `${base}-history`,
  };
}
