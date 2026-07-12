import type { DistrictV3Data } from "../types";

function districtPlaceholder(slug: string, name: string): DistrictV3Data {
  return {
    stats: [
      { id: "pop", label: "Population", value: "—", meta: "Census placeholder", trend: "neutral" },
      { id: "stories", label: "Stories today", value: "12+", trend: "up" },
      { id: "alerts", label: "Active alerts", value: "2", trend: "neutral" },
      { id: "events", label: "Events today", value: "5", trend: "up" },
    ],
    weather: {
      location: name,
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
        title: `${name} collector office: grievance camp this Saturday`,
        summary: "Citizens can submit land and revenue applications on-site.",
        meta: "Official · 3h ago",
      },
      {
        id: "gov-2",
        title: "Revised ward-wise sanitation schedule published",
        summary: "Collection timings updated for monsoon season.",
        meta: "Municipal · 5h ago",
      },
    ],
    traffic: [
      {
        id: "trf-1",
        title: "Main arterial road slow near city centre",
        meta: "+15 min · Road work",
      },
      {
        id: "trf-2",
        title: "Ring road clear — normal flow",
        meta: `${name} · Updated recently`,
      },
    ],
    jobs: [
      {
        id: "job-1",
        title: "District hospital staff nurse recruitment",
        meta: `Contract · ${name}`,
      },
      {
        id: "job-2",
        title: "CGPSC Assistant Engineer — 42 vacancies",
        meta: "Apply by Aug 15",
      },
      {
        id: "job-3",
        title: "Private sector operations associate",
        meta: "Full-time · Local IT park",
      },
    ],
    events: [
      {
        id: "evt-1",
        title: "Farmers' market at civic grounds",
        meta: "Today · 7 AM – 12 PM",
      },
      {
        id: "evt-2",
        title: "District library children's reading hour",
        meta: "Today · 10 AM · Free entry",
      },
      {
        id: "evt-3",
        title: "Municipal health camp",
        meta: "Today · 9 AM – 4 PM",
      },
    ],
    crime: [
      {
        id: "crm-1",
        title: "Police increase night patrols in market areas",
        summary: "Preventive measures ahead of festival season.",
        meta: "Law & order · 2h ago",
      },
      {
        id: "crm-2",
        title: "Cyber fraud awareness drive at district HQ",
        meta: "Community · Tomorrow",
      },
    ],
    business: [
      {
        id: "biz-1",
        title: "Local MSME cluster receives export facilitation grant",
        summary: "Handicraft units in the district to get packaging support.",
        meta: "Economy · 4h ago",
      },
      {
        id: "biz-2",
        title: "New retail park opening phase delayed to Q4",
        meta: "Business · 6h ago",
      },
    ],
    timeline: [
      {
        id: "tl-1",
        label: "6:30 AM",
        detail: "Morning traffic advisory issued for NH corridors",
        timestamp: "6:30 AM",
      },
      {
        id: "tl-2",
        label: "8:15 AM",
        detail: "District collector reviews monsoon preparedness",
        timestamp: "8:15 AM",
      },
      {
        id: "tl-3",
        label: "10:00 AM",
        detail: "Civic health camp opens at ward 12",
        timestamp: "10:00 AM",
      },
      {
        id: "tl-4",
        label: "12:30 PM",
        detail: "Business association meeting on local exports",
        timestamp: "12:30 PM",
      },
    ],
  };
}

const CACHE = new Map<string, DistrictV3Data>();

export function getDistrictV3Placeholder(slug: string, name: string): DistrictV3Data {
  const key = slug;
  if (!CACHE.has(key)) {
    CACHE.set(key, districtPlaceholder(slug, name));
  }
  return CACHE.get(key)!;
}
