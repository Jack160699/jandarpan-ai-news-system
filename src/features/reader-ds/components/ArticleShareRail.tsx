"use client";

import { JdIcon, type JdIconName } from "./icons";
import { useJdDsT } from "../i18n";

/**
 * Desktop sticky left share rail (SoT D03). Hidden below 1024 via CSS.
 */
export function ArticleShareRail({
  onShare,
  onSave,
}: {
  onShare?: () => void;
  onSave?: () => void;
}) {
  const { t } = useJdDsT();
  const items: Array<{ icon: JdIconName; label: string; onClick?: () => void }> = [
    { icon: "share", label: t("action.share"), onClick: onShare },
    { icon: "bookmark", label: t("action.save"), onClick: onSave },
    { icon: "headphone", label: t("action.listen") },
  ];

  return (
    <aside className="jd-share-rail" aria-label={t("action.share")}>
      {items.map((it) => (
        <button
          key={it.icon}
          type="button"
          className="jd-share-rail__btn"
          aria-label={it.label}
          onClick={it.onClick}
        >
          <JdIcon name={it.icon} size={18} stroke={1.9} color="var(--jd-navy)" />
        </button>
      ))}
    </aside>
  );
}
