import { EmptyState } from "@/components/ui/EmptyState";
import { isSupabaseConfigured } from "@/lib/supabase";

export function HomepageEmpty() {
  const configured = isSupabaseConfigured();

  return (
    <EmptyState
      className="nr-empty"
      kicker="Chhattisgarh desk"
      title="Stories are on their way"
      icon="◌"
      description={
        <>
          <p>
            The homepage reads from AI-generated editorials. Run clustering and
            generation, then refresh.
          </p>
          {!configured ? (
            <p className="mt-3">
              Supabase is not configured. Set{" "}
              <code className="text-[var(--ink-headline)]">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
              and your anon key.
            </p>
          ) : (
            <p className="mt-3 text-[var(--ds-text-caption)]">
              Enable <code>NEWSROOM_CLUSTER_EVENTS</code> and{" "}
              <code>NEWSROOM_GENERATE_ARTICLES</code>, then call{" "}
              <code>/api/generate-articles</code>.
            </p>
          )}
        </>
      }
    />
  );
}
