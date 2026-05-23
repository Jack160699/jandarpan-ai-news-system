import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LiveLoading() {
  return (
    <PageShell variant="news">
      <main id="main-content" className="live-page nr-root" role="main">
        <div className="live-desk nr-wrap" aria-hidden>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-1 h-6 w-32" />
          <div className="mt-3 space-y-0 border border-[var(--rule)] rounded-md overflow-hidden">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-none" />
            ))}
          </div>
        </div>
      </main>
    </PageShell>
  );
}
