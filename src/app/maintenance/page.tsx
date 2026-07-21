import { redirect } from "next/navigation";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { MaintenancePage } from "@/features/reader-ds/system";

/** F53 — planned maintenance surface (Preview / flag-gated). */
export default function MaintenanceRoute() {
  if (!isReaderDesignSystemEnabled()) redirect("/");
  return <MaintenancePage etaLabel="सुबह 6:00 बजे" />;
}
