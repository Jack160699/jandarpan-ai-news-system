/**
 * JDP-007 — Mock data for AI Assistant UI development.
 * Replace with API responses when wiring backend.
 */

import type {
  AiAnswer,
  AiHistorySession,
  AiPromptSuggestion,
  AiSuggestedQuestion,
} from "./types";

export const MOCK_PROMPT_SUGGESTIONS: AiPromptSuggestion[] = [
  { id: "brief", label: "Today's brief", prompt: "Summarize today's top stories in Chhattisgarh" },
  { id: "explain", label: "Explain simply", prompt: "Explain the latest policy news in simple terms" },
  { id: "compare", label: "Compare coverage", prompt: "How are different outlets covering this story?" },
  { id: "timeline", label: "Build timeline", prompt: "Create a timeline of events for this developing story" },
];

export const MOCK_SUGGESTED_QUESTIONS: AiSuggestedQuestion[] = [
  { id: "q1", question: "What are the top headlines from Raipur today?", category: "Local" },
  { id: "q2", question: "Summarize the latest IPL match results", category: "Sports" },
  { id: "q3", question: "What happened in the state assembly session?", category: "Politics" },
  { id: "q4", question: "Explain the new education policy changes", category: "Policy" },
  { id: "q5", question: "Show me weather alerts for my district", category: "Local" },
  { id: "q6", question: "What stories should I read next?", category: "For you" },
];

export const MOCK_HISTORY_SESSIONS: AiHistorySession[] = [
  {
    id: "sess-1",
    title: "Raipur infrastructure updates",
    preview: "Key projects and budget allocations discussed…",
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    messageCount: 4,
  },
  {
    id: "sess-2",
    title: "IPL weekend roundup",
    preview: "Match highlights and standings after Round 7…",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    messageCount: 2,
  },
  {
    id: "sess-3",
    title: "Monsoon preparedness",
    preview: "District-wise rainfall forecast and advisories…",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    messageCount: 6,
  },
];

export function createMockAnswer(prompt: string): AiAnswer {
  const now = new Date().toISOString();
  return {
    id: `ans-${Date.now()}`,
    content: `Here is a preview response for: "${prompt}". This UI uses mock data — connect \`/api/…\` routes later to stream real answers from your editorial AI stack.`,
    createdAt: now,
    sources: [
      {
        id: "src-1",
        title: "Raipur metro corridor gets cabinet nod",
        url: "/news/raipur-metro-corridor",
        outlet: "Jan Darpan",
        publishedAt: "2 hours ago",
        excerpt: "The state cabinet approved Phase 1 of the metro corridor connecting the airport to the city centre.",
      },
      {
        id: "src-2",
        title: "Infrastructure budget hiked by 18%",
        url: "/news/infrastructure-budget",
        outlet: "Jan Darpan",
        publishedAt: "5 hours ago",
        excerpt: "Finance department allocates additional funds for roads, bridges, and urban transit.",
      },
    ],
    timeline: [
      {
        id: "tl-1",
        time: "09:30",
        title: "Cabinet meeting begins",
        description: "Infrastructure agenda item listed first.",
      },
      {
        id: "tl-2",
        time: "11:15",
        title: "Metro corridor approved",
        description: "Phase 1 budget sanctioned; tenders expected next month.",
      },
      {
        id: "tl-3",
        time: "14:00",
        title: "Press briefing",
        description: "CM outlines timeline and employment projections.",
      },
    ],
  };
}
