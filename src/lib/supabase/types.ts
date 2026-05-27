export type { Database } from "@/types/supabase";
export type { NewsAiQueueRow } from "@/lib/types/news-article";

// Compatibility exports: legacy code imports these from `@/lib/supabase`.
// Keep these as thin re-exports to avoid reintroducing a second schema source.
export type {
  IngestionLogRow,
  IngestionFailureRow,
  RssSourceHealthRow,
} from "@/lib/supabase/types.backup";

export {
  CORE_ARTICLE_SELECT,
  EXTENDED_ARTICLE_SELECT,
} from "@/lib/supabase/types.backup";
