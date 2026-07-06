import { EmptyState } from "@/components/ui/EmptyState";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";

export async function HomepageEmpty() {
  const lang = await getServerReaderLanguage();
  const t = getDictionary(lang);

  return (
    <EmptyState
      className="nr-empty"
      title={t.home.emptyTitle}
      icon="◌"
      description={<p>{t.home.emptyBody}</p>}
    />
  );
}
