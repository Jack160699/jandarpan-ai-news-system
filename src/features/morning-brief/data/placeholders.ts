import type { MorningBriefData } from "../types";

/** Placeholder brief content until dedicated feeds ship. */
export const MORNING_BRIEF_PLACEHOLDER: MorningBriefData = {
  breaking: [
    {
      id: "brk-1",
      headline: "Raipur civic body announces monsoon preparedness review",
      category: "Breaking",
      publishedAt: "6:12 AM",
    },
    {
      id: "brk-2",
      headline: "State cabinet to discuss irrigation projects in today's session",
      category: "Politics",
      publishedAt: "5:48 AM",
    },
    {
      id: "brk-3",
      headline: "Bilaspur district on alert after heavy overnight rainfall",
      category: "Weather",
      publishedAt: "5:30 AM",
    },
  ],
  weather: {
    location: "Raipur",
    condition: "Partly cloudy",
    temperatureC: 28,
    highC: 33,
    lowC: 24,
    humidity: 72,
    placeholder: true,
  },
  government: [
    {
      id: "gov-1",
      title: "CM office: Public grievance helpline hours extended",
      summary: "Citizens can reach the helpline until 8 PM on weekdays.",
      meta: "Official · 2h ago",
    },
    {
      id: "gov-2",
      title: "Education dept releases revised school calendar",
      summary: "Mid-term assessments scheduled for the last week of July.",
      meta: "Notification · 4h ago",
    },
  ],
  jobs: [
    {
      id: "job-1",
      title: "CGPSC Assistant Engineer — 42 vacancies",
      meta: "Apply by Aug 15 · Raipur",
    },
    {
      id: "job-2",
      title: "District hospital staff nurse recruitment",
      meta: "Contract · Bilaspur",
    },
    {
      id: "job-3",
      title: "IT park operations associate",
      meta: "Private · Naya Raipur",
    },
  ],
  traffic: [
    {
      id: "trf-1",
      title: "NH-30 slow near Abhanpur due to road work",
      meta: "+18 min · Avoid left lane",
    },
    {
      id: "trf-2",
      title: "Ring Road clear — normal morning flow",
      meta: "Raipur · Updated 6:05 AM",
    },
  ],
  events: [
    {
      id: "evt-1",
      title: "Farmers' market at Marine Drive",
      meta: "Today · 7 AM – 12 PM",
    },
    {
      id: "evt-2",
      title: "District library children's reading hour",
      meta: "Today · 10 AM · Free entry",
    },
    {
      id: "evt-3",
      title: "Municipal health camp — Pandri ward",
      meta: "Today · 9 AM – 4 PM",
    },
  ],
  aiSummary:
    "Good morning. Chhattisgarh starts the day with monsoon vigil in Bilaspur, cabinet focus on irrigation, and extended civic helpline hours. Commuters should plan for delays on NH-30 near Abhanpur. Partly cloudy skies in Raipur with highs near 33°C.",
  audioTracks: [
    {
      id: "audio-1",
      title: "Top headlines — Chhattisgarh edition",
      durationSec: 186,
      categoryLabel: "Morning Brief",
    },
    {
      id: "audio-2",
      title: "Weather & traffic snapshot",
      durationSec: 72,
      categoryLabel: "Local",
    },
    {
      id: "audio-3",
      title: "Government & jobs roundup",
      durationSec: 94,
      categoryLabel: "Civic",
    },
  ],
  listenArticleIds: [],
};
