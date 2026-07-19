import Link from "next/link";
import { JdIcon } from "./icons";

type MastheadProps = {
  edition?: string;
  pageTitle?: string;
  back?: boolean;
  backHref?: string;
};

/** Compact sticky masthead: brand · search · notifications · profile. */
export function Masthead({ edition = "छत्तीसगढ़", pageTitle, back, backHref = "/" }: MastheadProps) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "linear-gradient(160deg, var(--jd-navy), var(--jd-navy-deep))",
        color: "var(--jd-paper)",
        borderBottom: "3px solid var(--jd-gold)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "9px 14px",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          {back ? (
            <Link href={backHref} aria-label="वापस" style={{ display: "flex", color: "var(--jd-gold-soft)" }}>
              <JdIcon name="arrowL" size={22} stroke={2} />
            </Link>
          ) : null}
          <Link href="/" style={{ display: "flex", alignItems: "baseline", gap: 8, color: "inherit", minWidth: 0 }}>
            <span className="jd-brand" style={{ fontSize: 26, lineHeight: "30px", fontWeight: 700 }}>
              जनदर्पण
            </span>
            {!pageTitle ? (
              <span className="jd-brand" style={{ fontSize: 13, color: "var(--jd-gold-soft)" }}>
                {edition}
              </span>
            ) : null}
          </Link>
          {pageTitle ? (
            <span
              className="jd-serif"
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--jd-gold-soft)",
                borderLeft: "1px solid rgba(231,214,164,.4)",
                paddingLeft: 9,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {pageTitle}
            </span>
          ) : null}
        </div>
        <nav style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <Link href="/search" aria-label="खोजें" style={iconBtn}>
            <JdIcon name="search" size={21} stroke={1.9} color="var(--jd-paper)" />
          </Link>
          <Link href="/notifications" aria-label="सूचनाएँ" style={iconBtn}>
            <JdIcon name="bell" size={21} stroke={1.9} color="var(--jd-paper)" />
          </Link>
          <Link href="/archive" aria-label="प्रोफ़ाइल" style={iconBtn}>
            <JdIcon name="user" size={21} stroke={1.9} color="var(--jd-paper)" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

const iconBtn = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 44,
  height: 44,
} as const;
