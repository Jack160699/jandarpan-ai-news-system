"use client";

import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { StateBody } from "./StateBody";
import { useJdDsT } from "../i18n";

/** F48 — calm general error. */
export function ErrorStatePage({
  reset,
  code = "JD-500",
}: {
  reset?: () => void;
  code?: string;
}) {
  const { t } = useJdDsT();
  return (
    <ReaderShell activeNav="home" reserveMiniPlayer={false} showPermissionSheets={false}>
      <Masthead back backHref="/" />
      <StateBody
        icon="alert"
        iconBg="rgba(158,27,34,.08)"
        iconColor="var(--jd-red)"
        title={t("system.error")}
        body={t("system.errorBody")}
        primary={{
          label: t("system.retry"),
          onClick:
            reset ??
            (() => {
              if (typeof window !== "undefined") window.location.reload();
            }),
        }}
        secondary={{ label: t("system.reportIssue"), href: "/contact" }}
      >
        <p
          className="jd-ui"
          style={{
            marginTop: 16,
            fontFamily: "ui-monospace, monospace",
            fontSize: 10,
            color: "var(--jd-muted)",
          }}
        >
          {t("system.errorCode", { code })}
        </p>
      </StateBody>
    </ReaderShell>
  );
}
