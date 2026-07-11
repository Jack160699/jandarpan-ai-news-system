import type { ExecutiveAnalyticsData } from "../types";

/** Placeholder executive analytics until live APIs wire in. */
export const EXECUTIVE_ANALYTICS_PLACEHOLDER: ExecutiveAnalyticsData = {
  updatedAt: "2026-07-11T12:45:00+05:30",
  readersToday: {
    total: 48_732,
    trend: { value: 12.4, direction: "up", label: "vs yesterday" },
    sparkline: [
      { label: "6a", value: 1200 },
      { label: "8a", value: 3400 },
      { label: "10a", value: 6200 },
      { label: "12p", value: 9800 },
      { label: "2p", value: 11200 },
      { label: "4p", value: 8900 },
      { label: "6p", value: 7200 },
      { label: "Now", value: 5800 },
    ],
  },
  activeUsers: {
    current: 1_847,
    peak: 2_310,
    trend: { value: 8.2, direction: "up", label: "vs same hour yesterday" },
  },
  topStories: [
    {
      id: "s1",
      rank: 1,
      headline: "Raipur civic body announces monsoon preparedness review",
      district: "Raipur",
      views: 12_480,
      changePct: 34,
    },
    {
      id: "s2",
      rank: 2,
      headline: "State cabinet to discuss irrigation projects in today's session",
      district: "State",
      views: 9_210,
      changePct: 18,
    },
    {
      id: "s3",
      rank: 3,
      headline: "Bilaspur district on alert after heavy overnight rainfall",
      district: "Bilaspur",
      views: 7_640,
      changePct: 52,
    },
    {
      id: "s4",
      rank: 4,
      headline: "CGPSC Assistant Engineer recruitment drive opens",
      district: "State",
      views: 5_890,
      changePct: -4,
    },
    {
      id: "s5",
      rank: 5,
      headline: "Durg industrial corridor sees new investment proposals",
      district: "Durg",
      views: 4_320,
      changePct: 11,
    },
  ],
  districtHeatmap: [
    { id: "raipur", name: "Raipur", readers: 14_200, intensity: 0.95 },
    { id: "bilaspur", name: "Bilaspur", readers: 8_400, intensity: 0.72 },
    { id: "durg", name: "Durg", readers: 6_100, intensity: 0.58 },
    { id: "korba", name: "Korba", readers: 4_800, intensity: 0.48 },
    { id: "raigarh", name: "Raigarh", readers: 3_900, intensity: 0.4 },
    { id: "jagdalpur", name: "Jagdalpur", readers: 3_200, intensity: 0.34 },
    { id: "ambikapur", name: "Ambikapur", readers: 2_700, intensity: 0.28 },
    { id: "dhamtari", name: "Dhamtari", readers: 2_100, intensity: 0.22 },
    { id: "kanker", name: "Kanker", readers: 1_800, intensity: 0.18 },
    { id: "janjgir", name: "Janjgir", readers: 1_500, intensity: 0.15 },
  ],
  aiUsage: {
    summary: [
      { label: "Summaries generated", value: "1,284", sublabel: "today" },
      { label: "Assistant sessions", value: "412", sublabel: "today" },
      { label: "Avg response time", value: "1.8s", sublabel: "p95" },
    ],
    requestsToday: 1_696,
    tokensToday: 2_840_000,
    trend: { value: 6.1, direction: "up", label: "vs 7-day avg" },
  },
  revenue: {
    placeholder: true,
    message: "Monetization analytics will appear here once billing integrations ship.",
  },
  engagement: {
    score: 74,
    metrics: [
      {
        label: "Avg. session",
        value: "4m 12s",
        trend: { value: 5.3, direction: "up", label: "vs last week" },
      },
      {
        label: "Scroll depth",
        value: "68%",
        trend: { value: 2.1, direction: "up", label: "vs last week" },
      },
      {
        label: "Return rate",
        value: "31%",
        trend: { value: 0.8, direction: "flat", label: "vs last week" },
      },
      {
        label: "Shares",
        value: "892",
        trend: { value: 14.2, direction: "up", label: "today" },
      },
    ],
  },
  liveStatus: {
    overall: "live",
    items: [
      { id: "readers", label: "Reader traffic", status: "live", detail: "Normal load" },
      { id: "ingest", label: "Ingestion pipeline", status: "live", detail: "Last run 4m ago" },
      { id: "ai", label: "AI services", status: "live", detail: "All models responsive" },
      { id: "cdn", label: "Edge delivery", status: "degraded", detail: "Elevated latency in SE Asia" },
    ],
  },
  performance: {
    score: 88,
    metrics: [
      { label: "LCP", value: "1.9s", target: "< 2.5s", status: "good" },
      { label: "API p95", value: "142ms", target: "< 200ms", status: "good" },
      { label: "Error rate", value: "0.02%", target: "< 0.1%", status: "good" },
      { label: "Cache hit", value: "94%", target: "> 90%", status: "good" },
    ],
  },
  systemHealth: {
    overall: "healthy",
    checks: [
      { id: "supabase", label: "Database", status: "healthy", latencyMs: 42 },
      { id: "openai", label: "OpenAI", status: "healthy", latencyMs: 180 },
      { id: "queues", label: "Job queues", status: "healthy", latencyMs: 28 },
      { id: "storage", label: "Storage", status: "healthy", latencyMs: 65 },
      { id: "realtime", label: "Realtime", status: "degraded", latencyMs: 210 },
      { id: "analytics", label: "Analytics pipeline", status: "healthy", latencyMs: 95 },
    ],
  },
};
