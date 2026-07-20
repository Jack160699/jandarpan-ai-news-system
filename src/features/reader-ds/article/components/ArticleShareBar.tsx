"use client";

import { JdIcon, type JdIconName } from "../../components/icons";
import { useJdDsT, type JdDsStringKey } from "../../i18n";

const ITEMS: Array<{ icon: JdIconName; labelKey: JdDsStringKey; action: string }> = [
  { icon: "headphone", labelKey: "action.listen", action: "listen" },
  { icon: "bookmark", labelKey: "action.save", action: "save" },
  { icon: "share", labelKey: "action.share", action: "share" },
  { icon: "more", labelKey: "action.more", action: "more" },
];

/** Sticky bottom share bar — approved B11. */
export function ArticleShareBar({ slug }: { slug?: string }) {
  const { t } = useJdDsT();

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        flexShrink: 0,
        borderTop: "1px solid var(--jd-line)",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "9px 0 max(9px, env(safe-area-inset-bottom))",
      }}
    >
      {ITEMS.map((a) => (
        <button
          key={a.action}
          type="button"
          data-action={a.action}
          data-slug={slug}
          className="jd-ui"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            minWidth: 56,
            minHeight: 44,
            justifyContent: "center",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--jd-ink-2)",
          }}
        >
          <JdIcon name={a.icon} size={20} stroke={1.8} color="var(--jd-ink-2)" />
          <span style={{ fontSize: 9.5, color: "var(--jd-ink-3)", fontWeight: 600 }}>{t(a.labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
