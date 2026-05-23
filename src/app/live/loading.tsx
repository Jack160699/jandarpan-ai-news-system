import { PageShell } from "@/components/layout/PageShell";
import { LiveWireListSkeleton, SectionHeaderSkeleton } from "@/components/loading";

export default function LiveLoading() {
  return (
    <PageShell variant="news">
      <main
        id="main-content"
        className="live-page nr-root route-loading--premium pl-stagger"
        role="main"
        aria-busy="true"
        aria-label="Loading live desk"
      >
        <div className="live-desk nr-wrap">
          <div className="pl-stagger-item">
            <SectionHeaderSkeleton />
          </div>
          <LiveWireListSkeleton rows={10} />
        </div>
      </main>
    </PageShell>
  );
}
