import { HomepageSkeleton } from "@/sections/homepage";

export default function RootLoading() {
  return (
    <div className="route-loading" aria-busy="true" aria-label="Loading">
      <HomepageSkeleton />
    </div>
  );
}
