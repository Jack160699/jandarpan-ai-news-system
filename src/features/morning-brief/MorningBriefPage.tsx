import { Suspense } from "react";
import type { MorningBriefData } from "./types";
import { MorningBriefExperience } from "./MorningBriefExperience";
import { Loading } from "./components/Loading";

export type MorningBriefPageProps = {
  data?: Partial<MorningBriefData>;
};

/**
 * Route shell for /morning-brief — delegates to MorningBriefExperience.
 */
export function MorningBriefPage({ data }: MorningBriefPageProps) {
  return (
    <Suspense fallback={<Loading label="Loading morning brief…" />}>
      <MorningBriefExperience data={data} />
    </Suspense>
  );
}
