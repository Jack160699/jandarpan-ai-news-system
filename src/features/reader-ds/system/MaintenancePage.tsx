"use client";

import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { StateBody } from "./StateBody";
import { useJdDsT } from "../i18n";

/** F53 — planned maintenance. */
export function MaintenancePage({
  etaLabel,
}: {
  etaLabel?: string;
}) {
  const { t } = useJdDsT();
  const eta = etaLabel ?? t("system.maintenanceEta");
  return (
    <ReaderShell hideBottomNav reserveMiniPlayer={false} showPermissionSheets={false}>
      <Masthead hideActions />
      <StateBody
        icon="cog"
        round
        title={t("system.maintenance")}
        body={t("system.maintenanceBody", { eta })}
        primary={{ label: t("system.statusPage"), href: "/contact" }}
        secondary={{ label: t("system.tryHome"), href: "/" }}
      />
    </ReaderShell>
  );
}
