"use client";

import Link from "next/link";
import { useJdDsT } from "../i18n";
import { JdIcon } from "./icons";

type MastheadNotifyButtonProps = {
  /**
   * Real unread count only. Never invent notifications —
   * omit or pass 0 to hide the badge without shifting layout.
   */
  unreadCount?: number;
};

/**
 * Notifications control — opens `/notifications` (canonical destination).
 * Badge is absolutely positioned in a reserved corner so count changes never shift icons.
 */
export function MastheadNotifyButton({ unreadCount = 0 }: MastheadNotifyButtonProps) {
  const { t } = useJdDsT();
  const showBadge = unreadCount > 0;

  return (
    <Link
      href="/notifications"
      aria-label={t("masthead.notifyAria")}
      data-testid="jd-masthead-notify"
      data-jd-unread={showBadge ? String(unreadCount) : "0"}
      className="jd-masthead__action"
      style={{
        display: "flex",
        minWidth: 44,
        minHeight: 44,
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        flexShrink: 0,
        textDecoration: "none",
      }}
    >
      <JdIcon name="bell" size={21} stroke={1.9} color="var(--jd-gold-soft)" />
      {/* Reserved badge slot — absolute, does not affect flex layout */}
      <span
        aria-hidden={!showBadge}
        data-testid="jd-masthead-notify-badge"
        data-jd-badge-visible={showBadge ? "1" : "0"}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 8,
          height: 8,
          borderRadius: 8,
          background: showBadge ? "var(--jd-red)" : "transparent",
          border: showBadge ? "1.5px solid var(--jd-navy)" : "1.5px solid transparent",
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
      />
    </Link>
  );
}
