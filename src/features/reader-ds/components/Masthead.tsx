import Link from "next/link";
import { JdIcon } from "./icons";

type MastheadProps = {
  pageTitle?: string;
  back?: boolean;
  backHref?: string;
};

/**
 * Compact sticky masthead — matches approved A1 atom:
 * solid navy · red “ज” mark · Tiro 22 wordmark · goldSoft icons · avatar.
 */
export function Masthead({ pageTitle, back, backHref = "/" }: MastheadProps) {
  return (
    <header
      className="jd-masthead"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        flexShrink: 0,
        background: "var(--jd-navy)",
        color: "var(--jd-paper)",
        padding: "8px 14px 9px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {back ? (
            <Link href={backHref} aria-label="वापस" style={{ display: "flex", color: "var(--jd-gold-soft)" }}>
              <JdIcon name="arrowL" size={22} stroke={2} color="var(--jd-gold-soft)" />
            </Link>
          ) : (
            <Link
              href="/"
              aria-label="जनदर्पण होम"
              style={{
                width: 24,
                height: 24,
                borderRadius: 5,
                background: "var(--jd-red)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                textDecoration: "none",
              }}
            >
              <span
                className="jd-brand"
                style={{ fontSize: 15, color: "var(--jd-gold)", fontWeight: 700, lineHeight: 1 }}
              >
                ज
              </span>
            </Link>
          )}
          {pageTitle ? (
            <span className="jd-serif" style={{ fontSize: 18, fontWeight: 700, color: "var(--jd-paper)" }}>
              {pageTitle}
            </span>
          ) : (
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="jd-brand" style={{ fontSize: 22, lineHeight: 1, display: "block" }}>
                जनदर्पण
              </span>
            </Link>
          )}
        </div>

        <nav style={{ display: "flex", gap: 16, alignItems: "center", flexShrink: 0 }} aria-label="शीर्ष क्रियाएँ">
          <Link href="/search" aria-label="खोजें" style={{ display: "flex", minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
            <JdIcon name="search" size={21} stroke={1.9} color="var(--jd-gold-soft)" />
          </Link>
          <Link
            href="/notifications"
            aria-label="सूचनाएँ"
            style={{ display: "flex", minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", position: "relative" }}
          >
            <JdIcon name="bell" size={21} stroke={1.9} color="var(--jd-gold-soft)" />
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 7,
                height: 7,
                borderRadius: 7,
                background: "var(--jd-red)",
                border: "1.5px solid var(--jd-navy)",
              }}
            />
          </Link>
          <Link
            href="/archive"
            aria-label="प्रोफ़ाइल"
            style={{ display: "flex", minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
          >
            <span
              aria-hidden
              style={{
                width: 24,
                height: 24,
                borderRadius: 24,
                background: "linear-gradient(135deg, var(--jd-gold), var(--jd-red))",
              }}
            />
          </Link>
        </nav>
      </div>
    </header>
  );
}
