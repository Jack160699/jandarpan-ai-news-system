import { PageShell } from "@/components/layout/PageShell";
import { SectionHeaderSkeleton } from "@/components/loading/HomepageLoadingView";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ListenLoading() {
  return (
    <PageShell variant="news">
      <main
        className="listen-page-root nr-wrap route-loading--premium pl-stagger"
        aria-busy="true"
        aria-label="Loading listen"
      >
        <div className="pl-stagger-item">
          <SectionHeaderSkeleton />
        </div>
        <Skeleton className="pl-stagger-item mt-4 h-40 w-full rounded-2xl" />
        <div className="mt-4 space-y-2 pl-stagger-item">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[88%]" />
          <Skeleton className="h-3 w-[72%]" />
        </div>
        <Skeleton className="pl-stagger-item mt-4 h-14 w-full rounded-xl" />
      </main>
    </PageShell>
  );
}
