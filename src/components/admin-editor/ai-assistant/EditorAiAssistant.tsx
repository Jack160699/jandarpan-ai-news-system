"use client";

import { useCallback } from "react";
import { useClientMounted } from "./hooks/useClientMounted";
import { EditorAiDesktopPanel } from "./EditorAiDesktopPanel";
import { EditorAiFloatingButton } from "./EditorAiFloatingButton";
import { EditorAiMobileSheet } from "./EditorAiMobileSheet";
import { useAiAssistant } from "./useAiAssistant";
import { useAiIntake } from "./useAiIntake";
import type { EditorAiAssistantProps, AiQuickActionId } from "./types";

export function EditorAiAssistant({
  context,
  callbacks,
}: EditorAiAssistantProps) {
  const mounted = useClientMounted();
  const assistant = useAiAssistant(context, callbacks);
  const intake = useAiIntake(context, callbacks);

  const handleQuickAction = useCallback(
    (id: AiQuickActionId) => {
      void assistant.generate(id);
    },
    [assistant]
  );

  const handleGenerate = useCallback(() => {
    void assistant.generate();
  }, [assistant]);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <div className="jd-ai-desktop">
        <EditorAiDesktopPanel
          open={assistant.desktopOpen}
          onToggle={() => assistant.setDesktopOpen(!assistant.desktopOpen)}
          activeTab={assistant.activeTab}
          onTabChange={assistant.setActiveTab}
          prompt={assistant.prompt}
          onPromptChange={assistant.setPrompt}
          onGenerate={handleGenerate}
          onQuickAction={handleQuickAction}
          isGenerating={assistant.isGenerating}
          tasks={assistant.tasks}
          responses={assistant.responses}
          history={assistant.history}
          assets={assistant.assets}
          onApply={assistant.applyResponse}
          intake={intake}
        />
      </div>

      <div className="jd-ai-mobile">
        <EditorAiFloatingButton
          active={assistant.mobileOpen}
          onClick={() => assistant.setMobileOpen(true)}
        />
        <EditorAiMobileSheet
          open={assistant.mobileOpen}
          onClose={() => assistant.setMobileOpen(false)}
          activeTab={assistant.activeTab}
          onTabChange={assistant.setActiveTab}
          prompt={assistant.prompt}
          onPromptChange={assistant.setPrompt}
          onGenerate={handleGenerate}
          onQuickAction={handleQuickAction}
          isGenerating={assistant.isGenerating}
          tasks={assistant.tasks}
          responses={assistant.responses}
          history={assistant.history}
          assets={assistant.assets}
          onApply={assistant.applyResponse}
          intake={intake}
        />
      </div>
    </>
  );
}
