/**
 * Public database typings — re-export from canonical generator module.
 * Run `npm run supabase:types` after schema changes to refresh.
 */

export type {
  Database,
  NewsAiQueueRow,
  EditorialImageQueueRow,
  NewsroomTenantRow,
  TenantMembershipRow,
  IngestionLogRow,
  IngestionFailureRow,
  RssSourceHealthRow,
  ApiProviderHealthRow,
} from "@/lib/supabase/types";

export type { GeneratedArticleRow } from "@/lib/types/newsroom";

export {
  CORE_ARTICLE_SELECT,
  EXTENDED_ARTICLE_SELECT,
} from "@/lib/supabase/types";
