export type AiAssistantTab = "intake" | "chat" | "tools" | "assets" | "history";

/** Text-first intake modes only — no multimedia pipelines. */
export type AiIntakeMode = "prompt" | "link" | "text";

export type AiIntakeStepStatus = "queued" | "processing" | "completed" | "failed";

export type AiIntakeStep = {
  id: string;
  label: string;
  status: AiIntakeStepStatus;
};

export type AiSocialCaption = {
  platform: "whatsapp" | "x" | "facebook";
  text: string;
};

export type AiStoryDraft = {
  id: string;
  sourceType: AiIntakeMode;
  headline: string;
  summary: string;
  body: string;
  tags: string[];
  seoTitle: string;
  metaDescription: string;
  socialCaptions: AiSocialCaption[];
  coverImageUrl?: string | null;
  meta?: {
    sourceUrl?: string;
  };
  createdAt: string;
};

export type AiQuickActionId =
  | "improve_headline"
  | "rewrite"
  | "summarize"
  | "translate"
  | "generate_tags"
  | "social_posts";

export type AiTaskStatus = "pending" | "running" | "done" | "error";

export type AiTask = {
  id: string;
  label: string;
  status: AiTaskStatus;
};

export type AiResponseKind =
  | "text"
  | "headlines"
  | "tags"
  | "social"
  | "body";

export type AiResponse = {
  id: string;
  kind: AiResponseKind;
  title: string;
  content: string;
  items?: string[];
  createdAt: string;
  actionId?: AiQuickActionId;
};

export type AiHistoryEntry = {
  id: string;
  prompt: string;
  actionLabel: string;
  createdAt: string;
};

export type AiAsset = {
  id: string;
  label: string;
  type: "snippet" | "headline" | "social";
  preview: string;
  createdAt: string;
};

export type EditorAiContext = {
  headline: string;
  summary: string;
  bodyMarkdown: string;
  language: string;
  tags: string[];
};

export type EditorAiInsertTarget = "body" | "headline" | "summary" | "tags";

export type EditorAiCallbacks = {
  onInsertBody: (markdown: string) => void;
  onUpdateHeadline: (headline: string) => void;
  onUpdateSummary: (summary: string) => void;
  onUpdateTags: (tags: string[]) => void;
  onApplyStoryDraft?: (draft: AiStoryDraft) => void;
  onToast?: (message: string) => void;
};

export type EditorAiAssistantProps = {
  context: EditorAiContext;
  callbacks: EditorAiCallbacks;
  className?: string;
};
