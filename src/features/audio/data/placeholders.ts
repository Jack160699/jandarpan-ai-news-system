import type {
  AudioPlaylist,
  AudioTrack,
  AudioVoice,
  ContinueListeningItem,
} from "../types";

export const AUDIO_VOICES_PLACEHOLDER: AudioVoice[] = [
  {
    id: "hi-female-1",
    label: "Priya",
    description: "Warm Hindi narrator",
    language: "hi",
    placeholder: true,
  },
  {
    id: "hi-male-1",
    label: "Arjun",
    description: "Clear Hindi briefing voice",
    language: "hi",
    placeholder: true,
  },
  {
    id: "en-female-1",
    label: "Maya",
    description: "English summary voice",
    language: "en",
    placeholder: true,
  },
];

export const AUDIO_TRACKS_PLACEHOLDER: AudioTrack[] = [
  {
    id: "audio-1",
    slug: "raipur-monsoon-preparedness",
    headline: "Raipur civic body announces monsoon preparedness review",
    transcript:
      "The Raipur Municipal Corporation will conduct a city-wide monsoon preparedness review this week. Officials said drainage teams have been placed on standby across low-lying wards.",
    durationSec: 42,
    categoryLabel: "Breaking",
    language: "en",
    voiceId: "en-female-1",
    subtitles: [
      { id: "c1", startSec: 0, endSec: 12, text: "The Raipur Municipal Corporation will conduct a city-wide monsoon preparedness review this week." },
      { id: "c2", startSec: 12, endSec: 28, text: "Officials said drainage teams have been placed on standby across low-lying wards." },
    ],
    placeholder: true,
  },
  {
    id: "audio-2",
    slug: "cabinet-irrigation-session",
    headline: "राज्य कैबिनेट आज सिंचाई परियोजनाओं पर चर्चा करेगी",
    transcript:
      "छत्तीसगढ़ कैबिनेट की बैठक में सिंचाई परियोजनाओं और किसान कल्याण योजनाओं पर विस्तृत चर्चा होगी। मुख्यमंत्री कार्यालय ने बताया कि नए बजट प्रावधानों पर भी फैसला लिया जा सकता है।",
    durationSec: 55,
    categoryLabel: "Politics",
    language: "hi",
    voiceId: "hi-female-1",
    placeholder: true,
  },
  {
    id: "audio-3",
    slug: "bilaspur-rainfall-alert",
    headline: "Bilaspur district on alert after heavy overnight rainfall",
    transcript:
      "District administration in Bilaspur has issued a rainfall alert after overnight showers exceeded seasonal averages. Rescue teams are monitoring river levels near low bridges.",
    durationSec: 38,
    categoryLabel: "Weather",
    language: "en",
    voiceId: "en-female-1",
    placeholder: true,
  },
  {
    id: "audio-4",
    slug: "cgpsc-engineer-vacancies",
    headline: "CGPSC announces 42 Assistant Engineer vacancies",
    transcript:
      "The Chhattisgarh Public Service Commission has published a notification for 42 Assistant Engineer posts. Online applications open next Monday.",
    durationSec: 33,
    categoryLabel: "Jobs",
    language: "en",
    voiceId: "en-female-1",
    placeholder: true,
  },
];

export const AUDIO_PLAYLISTS_PLACEHOLDER: AudioPlaylist[] = [
  {
    id: "pl-morning",
    title: "Morning Headlines",
    description: "Top stories to start your day",
    trackIds: ["audio-1", "audio-2", "audio-3"],
    placeholder: true,
  },
  {
    id: "pl-district",
    title: "District Desk",
    description: "Regional updates from across Chhattisgarh",
    trackIds: ["audio-3", "audio-4"],
    placeholder: true,
  },
];

export const CONTINUE_LISTENING_PLACEHOLDER: ContinueListeningItem[] = [
  {
    id: "cl-1",
    trackId: "audio-2",
    headline: "राज्य कैबिनेट आज सिंचाई परियोजनाओं पर चर्चा करेगी",
    progressSec: 22,
    durationSec: 55,
    categoryLabel: "Politics",
    updatedAt: "Today, 6:40 AM",
  },
  {
    id: "cl-2",
    trackId: "audio-1",
    headline: "Raipur civic body announces monsoon preparedness review",
    progressSec: 18,
    durationSec: 42,
    categoryLabel: "Breaking",
    updatedAt: "Yesterday, 8:15 PM",
  },
];
