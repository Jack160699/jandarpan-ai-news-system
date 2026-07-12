import { Suspense } from "react";
import type { DistrictExperienceV3Props } from "./types";
import { DistrictExperienceV3 } from "./DistrictExperienceV3";
import { Loading } from "./components/Loading";

export type DistrictV3PageProps = Omit<DistrictExperienceV3Props, "simulateLoadMs">;

/**
 * Route shell for /district/[slug] — delegates to DistrictExperienceV3.
 */
export function DistrictV3Page(props: DistrictV3PageProps) {
  return (
    <Suspense fallback={<Loading label="Loading your district…" />}>
      <DistrictExperienceV3 {...props} />
    </Suspense>
  );
}
