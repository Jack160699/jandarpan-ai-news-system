"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/design-system/utils/cn";
import { AnswerCard } from "./AnswerCard";
import { EmptyState } from "./EmptyState";
import { Loading } from "./Loading";
import { Typing } from "./Typing";
import type { AiConversationMessage, AiSuggestedQuestion } from "../types";

export type ConversationProps = {
  id?: string;
  messages: AiConversationMessage[];
  isLoading?: boolean;
  isTyping?: boolean;
  suggestedQuestions?: AiSuggestedQuestion[];
  onNewChat?: () => void;
  onAskQuestion?: (question: string) => void;
  className?: string;
};

/**
 * Scrollable message feed with user bubbles and assistant answer cards.
 */
export function Conversation({
  id,
  messages,
  isLoading,
  isTyping,
  suggestedQuestions,
  onNewChat,
  onAskQuestion,
  className,
}: ConversationProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  const isEmpty = messages.length === 0 && !isLoading && !isTyping;

  return (
    <div
      id={id}
      className={cn("ai-v3-conversation", className)}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-busy={isLoading || isTyping || undefined}
    >
      {isLoading && <Loading variant="inline" />}

      {isEmpty && (
        <EmptyState
          onNewChat={onNewChat}
          onAskQuestion={onAskQuestion}
          suggestedQuestions={suggestedQuestions}
        />
      )}

      {messages.length > 0 && (
        <ul className="ai-v3-conversation__list" role="list">
          {messages.map((msg) => (
            <li
              key={msg.id}
              className={cn(
                "ai-v3-conversation__item",
                msg.role === "user" ? "ai-v3-conversation__item--user" : "ai-v3-conversation__item--assistant"
              )}
            >
              {msg.role === "user" ? (
                <div className="ai-v3-user-bubble" aria-label="Your message">
                  <p>{msg.content}</p>
                </div>
              ) : (
                <AnswerCard answer={msg.answer} />
              )}
            </li>
          ))}
        </ul>
      )}

      {isTyping && <Typing className="ai-v3-conversation__typing" />}

      <div ref={endRef} className="ai-v3-conversation__anchor" aria-hidden />
    </div>
  );
}
