"use client";

import { StateBody } from "./StateBody";
import { useJdDsT } from "../i18n";

/** F47 — friendly empty guidance (saved / followed / etc.). */
export function EmptyState({
  title,
  body,
  primaryLabel,
  primaryHref = "/",
}: {
  title?: string;
  body?: string;
  primaryLabel?: string;
  primaryHref?: string;
}) {
  const { t } = useJdDsT();
  return (
    <StateBody
      icon="bookmark"
      title={title ?? t("system.empty")}
      body={body ?? t("saved.emptyBody")}
      primary={{ label: primaryLabel ?? t("saved.seeNews"), href: primaryHref }}
    />
  );
}
