import type { HomeSectionId } from "@/lib/homepage/types";
import type { SearchDistrict } from "@/lib/search/types";

export type SearchV3District = {
  id: SearchDistrict;
  label: string;
  labelHi?: string;
};

export type SearchV3Topic = {
  id: string;
  label: string;
  labelHi?: string;
  query: string;
  href?: string;
};

export type SearchV3Category = {
  id: HomeSectionId;
  label: string;
  labelHi?: string;
};

export const SEARCH_V3_DISTRICTS: SearchV3District[] = [
  { id: "raipur", label: "Raipur", labelHi: "रायपुर" },
  { id: "bilaspur", label: "Bilaspur", labelHi: "बिलासपुर" },
  { id: "bastar", label: "Bastar", labelHi: "बस्तर" },
  { id: "durg", label: "Durg", labelHi: "दुर्ग" },
  { id: "bhilai", label: "Bhilai", labelHi: "भिलाई" },
  { id: "korba", label: "Korba", labelHi: "कोरबा" },
  { id: "jagdalpur", label: "Jagdalpur", labelHi: "जगदलपुर" },
  { id: "ambikapur", label: "Ambikapur", labelHi: "अंबिकापुर" },
  { id: "raigarh", label: "Raigarh", labelHi: "रायगढ़" },
  { id: "chhattisgarh", label: "Chhattisgarh", labelHi: "छत्तीसगढ़" },
];

export const SEARCH_V3_CATEGORIES: SearchV3Category[] = [
  { id: "india", label: "Politics", labelHi: "राजनीति" },
  { id: "business", label: "Business", labelHi: "व्यापार" },
  { id: "sports", label: "Sports", labelHi: "खेल" },
  { id: "education", label: "Education", labelHi: "शिक्षा" },
  { id: "chhattisgarh", label: "Chhattisgarh", labelHi: "छत्तीसगढ़" },
  { id: "world", label: "World", labelHi: "विश्व" },
];

export const SEARCH_V3_TOPICS: SearchV3Topic[] = [
  { id: "jobs", label: "Jobs", labelHi: "नौकरी", query: "jobs", href: "/topics/jobs" },
  { id: "crime", label: "Crime", labelHi: "अपराध", query: "crime" },
  { id: "yojana", label: "Yojana", labelHi: "योजना", query: "yojana", href: "/topics/yojana" },
  { id: "cricket", label: "Cricket", labelHi: "क्रिकेट", query: "cricket" },
  { id: "weather", label: "Weather", labelHi: "मौसम", query: "weather" },
  { id: "election", label: "Election", labelHi: "चुनाव", query: "election" },
];
