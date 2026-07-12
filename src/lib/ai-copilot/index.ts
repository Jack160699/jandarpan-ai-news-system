export { loadCopilotDashboard } from "@/lib/ai-copilot/engine";
export { handleCopilotChat } from "@/lib/ai-copilot/chat-handler";
export { buildArticleWorkspace } from "@/lib/ai-copilot/workspace";
export { searchInsights } from "@/lib/ai-copilot/insight-search";
export { isAiCopilotEnabled } from "@/lib/ai-copilot/config";
export type {
  CopilotDashboard,
  UnifiedRecommendation,
  ChatResponse,
  ArticleWorkspace,
  InsightSearchResult,
} from "@/lib/ai-copilot/types";
