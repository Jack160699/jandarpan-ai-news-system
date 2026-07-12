import { Suspense } from "react";
import { NotificationCenterExperience } from "./NotificationCenterExperience";
import { NotificationLoadingState } from "./components/NotificationLoadingState";

export type NotificationCenterPageProps = {
  simulateLoadMs?: number;
};

/**
 * Route shell for /notifications — delegates to NotificationCenterExperience.
 */
export function NotificationCenterPage({
  simulateLoadMs,
}: NotificationCenterPageProps) {
  return (
    <Suspense fallback={<NotificationLoadingState />}>
      <NotificationCenterExperience simulateLoadMs={simulateLoadMs} />
    </Suspense>
  );
}
