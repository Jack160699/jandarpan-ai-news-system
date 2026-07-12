import { Suspense } from "react";
import type { LiveExperienceV3Props } from "./types";
import { LiveExperienceV3 } from "./LiveExperienceV3";
import { Loading } from "./components/Loading";

export type LiveV3PageProps = Omit<LiveExperienceV3Props, "simulateLoadMs">;

/**
 * Route shell for /live — delegates to LiveExperienceV3.
 */
export function LiveV3Page(props: LiveV3PageProps) {
  return (
    <Suspense fallback={<Loading label="Loading live desk…" />}>
      <LiveExperienceV3 {...props} />
    </Suspense>
  );
}
