"use client";

import Link from "next/link";
import { JdIcon, type JdIconName } from "./icons";

/** Listen / share / save action row — wired to listen hub, Web Share, bookmarks. */
export function ActionRow({ slug, title }: { slug?: string; title?: string }) {
  return (
    <div style={{ display: "flex", gap: 18, padding: "4px 0 2px" }} data-slug={slug}>
      <ActionButton
        icon="headphone"
        label="सुनें"
        href={slug ? `/listen?story=${encodeURIComponent(slug)}` : "/listen"}
      />
      <ActionButton
        icon="share"
        label="शेयर"
        onClick={async () => {
          const url =
            typeof window !== "undefined" && slug
              ? `${window.location.origin}/story/${slug}`
              : typeof window !== "undefined"
                ? window.location.href
                : "";
          try {
            if (navigator.share) {
              await navigator.share({ title: title ?? "जनदर्पण", url });
            } else if (navigator.clipboard && url) {
              await navigator.clipboard.writeText(url);
            }
          } catch {
            /* user cancelled */
          }
        }}
      />
      <ActionButton
        icon="bookmark"
        label="सहेजें"
        onClick={() => {
          if (!slug) return;
          void import("@/lib/reading-memory").then(({ loadReadingMemory, toggleBookmark }) => {
            toggleBookmark(loadReadingMemory(), slug);
          });
        }}
      />
    </div>
  );
}

function ActionButton({
  icon,
  label,
  href,
  onClick,
}: {
  icon: JdIconName;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const style = {
    display: "flex" as const,
    alignItems: "center",
    gap: 5,
    fontSize: 11.5,
    fontWeight: 600,
    color: "var(--jd-ink-3)",
    background: "none",
    border: "none",
    padding: "6px 2px",
    minHeight: 40,
    cursor: "pointer",
    textDecoration: "none",
  };
  if (href) {
    return (
      <Link href={href} className="jd-ui" style={style} data-action={icon}>
        <JdIcon name={icon} size={16} stroke={1.8} />
        {label}
      </Link>
    );
  }
  return (
    <button type="button" className="jd-ui" style={style} data-action={icon} onClick={onClick}>
      <JdIcon name={icon} size={16} stroke={1.8} />
      {label}
    </button>
  );
}
