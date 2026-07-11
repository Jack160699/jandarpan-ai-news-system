export { MorningBriefPage } from "./MorningBriefPage";
export { MorningBriefExperience } from "./MorningBriefExperience";

export { Greeting } from "./components/Greeting";
export { BriefCard } from "./components/BriefCard";
export { Breaking } from "./components/Breaking";
export { Weather } from "./components/Weather";
export { Government } from "./components/Government";
export { Jobs } from "./components/Jobs";
export { Traffic } from "./components/Traffic";
export { Events } from "./components/Events";
export { MorningBriefAISummary } from "./components/MorningBriefAISummary";
export { AudioPlayer } from "./components/AudioPlayer";
export { CompletionScreen } from "./components/CompletionScreen";
export { Loading } from "./components/Loading";
export {
  MorningBriefSkeleton,
  BriefCardSkeleton,
  GreetingSkeleton,
} from "./components/Skeleton";
export { Responsive } from "./components/Responsive";

export { useMorningBriefData } from "./hooks/useMorningBriefData";
export { MORNING_BRIEF_PLACEHOLDER } from "./data/placeholders";
export type {
  MorningBriefData,
  MorningBriefBreakingItem,
  MorningBriefWeather,
  MorningBriefListItem,
  MorningBriefAudioTrack,
} from "./types";

/** Alias for design-system clarity in consuming code */
export { MorningBriefAISummary as AISummary } from "./components/MorningBriefAISummary";
