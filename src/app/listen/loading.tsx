import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ListenLoading() {
  return (
    <PageShell variant="news">
      <main className="listen-page-root nr-wrap" aria-hidden>
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-4 h-40 w-full rounded-2xl" />
        <Skeleton className="mt-4 h-24 w-full rounded-xl" />
      </main>
    </PageShell>
  );
}
